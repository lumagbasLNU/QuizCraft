// Function to handle both Registration and Login
async function handleAuth(event, type) {
    event.preventDefault(); // Stop the page from refreshing

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');
    
    let payload = { username, password };

    // If registering, we also need the email and to verify passwords match
    if (type === 'register') {
        const email = document.getElementById('email').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            messageElement.innerText = "Passwords do not match!";
            messageElement.style.color = "#d9534f";
            return;
        }
        payload.email = email;
    }

    try {
        // Send the payload to the backend
        const response = await fetch(`/api/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            if (type === 'login') {
                // Save the token securely to localStorage
                localStorage.setItem('token', data.token);
                
                messageElement.innerText = "Login Successful! Redirecting...";
                messageElement.style.color = "#4CAF50";
                
                // Decode the JWT payload to find the user role
                // The payload is the second part of the token (index 1), base64 encoded
                const payloadStr = atob(data.token.split('.')[1]);
                const tokenPayload = JSON.parse(payloadStr);

                setTimeout(() => {
                    if (tokenPayload.role === 'admin') {
                        window.location.href = '/admin-dashboard';
                    } else {
                        window.location.href = '/dashboard'; 
                    }
                }, 1000);
            } else {
                messageElement.innerText = "Registration Successful! Redirecting to login...";
                messageElement.style.color = "#4CAF50";
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            }
        } else {
            messageElement.innerText = data.message || "Something went wrong.";
            messageElement.style.color = "#d9534f";
        }
    } catch (error) {
        console.error("Error:", error);
        messageElement.innerText = "Cannot connect to server.";
        messageElement.style.color = "#d9534f";
    }
}