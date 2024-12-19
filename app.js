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
}

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
