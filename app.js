const sql = require('mssql');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Adres frontendu
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

// Konfiguracja połączenia do bazy danych
const config = {
    user: 'SQLCONNECT',
    password: 'nnd',
    server: '127.0.0.1',
    database: 'klinika_prod',
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};
// Testowanie połączenia z bazą
async function executeQuery() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query('SELECT * FROM daneDoLogowania');
        console.log(result.recordset);
        sql.close();
    } catch (err) {
        console.error('Błąd połączenia z SQL Server:', err);
    }
};
// Middleware
app.use(bodyParser.json());

// Endpoint do rejestracji
app.post('/api/register', async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(400).send('Wszystkie pola są wymagane.');
    }

    try {
        let pool = await sql.connect(config);

        // Sprawdzenie, czy login już istnieje
        const checkLogin = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT Login FROM daneDoLogowania WHERE Login = @username');

        if (checkLogin.recordset.length > 0) {
            return res.status(409).send('Nazwa użytkownika jest już zajęta.');
        }

        // Hashowanie hasła i dodanie nowego użytkownika
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.request()
            .input('name', sql.VarChar, name)
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, hashedPassword)
            .query(`
                INSERT INTO daneDoLogowania (Imie_nazwisko, Login, Haslo) 
                VALUES (@name, @username, @password)
            `);

        res.status(200).send({ message: 'Rejestracja zakończona sukcesem!' });
    } catch (err) {
        console.error('Błąd podczas połączenia z bazą danych:', err);
        res.status(500).send('Wystąpił błąd serwera.');
    }
});

// Endpoint do logowania
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Wszystkie pola są wymagane.');
    }

    try {
        let pool = await sql.connect(config);
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .query(`
                SELECT Haslo, czylek FROM daneDoLogowania 
                WHERE Login = @username
            `);

        if (result.recordset.length === 0) {
            return res.status(404).send('Użytkownik nie istnieje.');
        }

        const { Haslo: hashedPassword, czylek } = result.recordset[0];

        // Sprawdzenie poprawności hasła
        const isPasswordValid = await bcrypt.compare(password, hashedPassword);

        if (!isPasswordValid) {
            return res.status(401).send('Nieprawidłowe hasło.');
        }

        // Wybór odpowiedniego dashboardu na podstawie wartości czylek
        if (czylek === null) {
            res.status(200).send({ redirect: 'patient_dashboard_panel.html' });
        } else if (czylek === '1') {
            res.status(200).send({ redirect: 'doctor_dashboard_panel.html' });
        } else {
            console.error(`Nieznana wartość czylek: ${czylek}`);
            res.status(400).send('Nieprawidłowy typ użytkownika.');
        }
    } catch (err) {
        console.error('Błąd podczas połączenia z bazą danych:', err);
        res.status(500).send('Wystąpił błąd serwera.');
    }
});

// Endpoint do rejestracji wizyty
app.post('/api/registerAppointment', async (req, res) => {
    const { patientName, appointmentTime } = req.body;

    try {
        await registerAppointment(patientName, new Date(appointmentTime));
        res.status(200).send('Wizyta została zarejestrowana pomyślnie!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Wystąpił błąd podczas rejestrowania wizyty.');
    }
});

// Endpoint do pobierania wizyt
app.get('/api/appointments', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query('SELECT * FROM wizyty');
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Wystąpił błąd podczas pobierania wizyt.');
    }
});


// Obsługa rejestracji wizyty
async function registerAppointment(patientName, appointmentTime) {
    try {
        const pool = await sql.connect(config);
        console.log('Połączono z bazą danych.');

        const result = await pool.request()
            .input('Imie_nazwisko', sql.NVarChar, patientName)
            .query('SELECT Login FROM daneDoLogowania WHERE Imie_nazwisko = @Imie_nazwisko');

        if (result.recordset.length === 0) {
            console.error('Nie znaleziono pacjenta:', patientName);
            throw new Error('Nie znaleziono pacjenta w bazie danych.');
        }

        const login = result.recordset[0].Login;
        console.log(`Znaleziony login: ${login}`);

        await pool.request()
            .input('Imie_nazwisko', sql.NVarChar, patientName)
            .input('Login', sql.NVarChar, login)
            .input('Data', sql.DateTime, appointmentTime)
            .query('INSERT INTO wizyty (Imie_nazwisko, Login, Data) VALUES (@Imie_nazwisko, @Login, @Data)');

        console.log('Wizyta została zarejestrowana pomyślnie!');
    } catch (err) {
        console.error('Błąd w registerAppointment:', err); 
        throw err;
    }
}


module.exports = { registerAppointment };



executeQuery();

// Obsługa błędów SQL
sql.on('error', (err) => {
    console.error('Błąd SQL:', err);
});

// Uruchamianie serwera
const port = 3001;
app.listen(port, () => {
    console.log(`Serwer działa na porcie ${port}`);
});
