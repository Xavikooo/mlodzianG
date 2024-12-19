document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const result = await response.json();
            // Przekierowanie na stronę z odpowiednim panelem
            if (result.redirect) {
                window.location.href = result.redirect;
            } else {
                alert('Logowanie zakończone sukcesem!');
            }
        } else {
            const errorMessage = await response.text();
            alert(`Błąd logowania: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        alert('Nie udało się zalogować.');
    }
});
