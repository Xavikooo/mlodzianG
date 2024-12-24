//Obsługa wysłki formularza 
document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const patientName = document.getElementById('patientName').value;
    const appointmentTime = new Date(document.getElementById('appointmentTime').value);

    const day = appointmentTime.getDay();
    const hour = appointmentTime.getHours();
    const minutes = appointmentTime.getMinutes();
//Ograniczenie dla daty
    if (day === 0 || day === 6 || hour < 8 || hour > 15 || (minutes % 30 !== 0)) {
        alert('Nieprawidłowy termin wizyty. Wizyty są możliwe tylko od poniedziałku do piątku w godzinach od 8:00 do 16:00.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/registerAppointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientName, appointmentTime }),
        });

        if (!response.ok) {
            throw new Error('Nie udało się zarejestrować wizyty.');
        }

        const message = await response.text();
        alert(message);
        fetchAppointments();
    } catch (err) {
        console.error('Error:', err);
        alert('Wystąpił błąd podczas rejestrowania wizyty.');
    }
});

async function fetchAppointments() {
    try {
        const response = await fetch('http://localhost:3001/api/appointments');
        const appointments = await response.json();

        const appointmentsDiv = document.getElementById('appointments');
        appointmentsDiv.innerHTML = '<h3>Zarejestrowane wizyty:</h3>';

        appointments.forEach(appointment => {
            const div = document.createElement('div');
            div.textContent = `${appointment.Imie_nazwisko} - ${new Date(appointment.data).toLocaleString()}`;
            console.log(appointment.data);
            appointmentsDiv.appendChild(div);
        });
    } catch (err) {
        console.error('Error fetching appointments:', err);
    }
}

document.addEventListener('DOMContentLoaded', fetchAppointments);