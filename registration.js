document.getElementById('registrationForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:3001/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, username, password })
        });
        // Komunikat o udanej rejestracji oraz przekierowanie na strone logowania
        if (response.ok) {
            const result = await response.json();
            alert(result.message || 'Rejestracja zakończona sukcesem, Zostaniesz przekierowany do panelu logowania!');
            window.location.href = 'login.html';
        } 
        // Pobranie komunikatu błędu
        else {
            const errorMessage = await response.text(); 
            alert(`Wystąpił błąd: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Błąd podczas wysyłania danych:', error);
        alert('Nie udało się wysłać danych.');
    }
});
