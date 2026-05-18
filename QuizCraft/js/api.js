/**
 * api.js
 * A utility wrapper around the native fetch() API.
 * It automatically injects the JWT token from localStorage into the Authorization header.
 */

async function fetchWithAuth(url, options = {}) {
    // 1. Grab the token from localStorage
    const token = localStorage.getItem('token');

    // 2. Prepare the headers object
    const headers = new Headers(options.headers || {});

    // 3. Inject the token if it exists
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Ensure Content-Type is set for JSON requests if a body exists and it's a string
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // 4. Merge the new headers back into the config object
    const config = {
        ...options,
        headers
    };

    // 5. Execute the fetch request
    try {
        const response = await fetch(url, config);

        // Global handling for expired or invalid tokens
        if (response.status === 401) {
            console.warn("Session expired or unauthorized. Redirecting to login.");
            localStorage.removeItem('token');
            // Redirect to the login page (ensure this path matches your routing setup)
            window.location.href = '/login';
        }

        return response;
    } catch (error) {
        console.error("Network error in fetchWithAuth:", error);
        throw error;
    }
}
