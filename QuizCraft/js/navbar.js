// --- 1. NAVBAR TEMPLATE ---
const navbarTemplate = `
    <nav class="top-navbar glass-panel">
        <div class="nav-left">
            <img src="../assets/icons/mini_logo.svg" alt="QuizCraft Logo" class="mini-logo">
        </div>
        
        <div class="nav-right">
            <button class="create-quiz-btn" id="openQuizModalBtn" aria-label="Create a Quiz">
                <img src="../assets/icons/create_quiz_button.svg" alt="" class="img-normal">
                <img src="../assets/icons/create_quiz_button_hover.svg" alt="" class="img-hover">
            </button>
            
            <div class="user-info">
                <span class="username" id="nav-username">User</span>
                <span class="email" id="nav-email"></span>
            </div>

            <a href="/quiz_history" class="settings-btn" aria-label="Quiz History" style="text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="settings-icon">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            </a>

            <button class="settings-btn" id="openSettingsBtn" aria-label="Settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="settings-icon">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>
            
            <a href="/login" class="logout-btn">
                <img src="../assets/icons/logout_button.svg" alt="Logout" class="logout-icon">
            </a>
        </div>
    </nav>
`;

// --- 2. MODAL TEMPLATE ---
// FIX 1: Added style="display: none;" to physically hide it on initial load
const modalTemplate = `
    <div id="quizTypeModal" class="modal-overlay" style="display: none;">
        <div class="modal-content glass-panel">
            
            <button class="btn-back" id="closeModalBtn" aria-label="Go back">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FFF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 8 8 12 12 16"></polyline>
                    <line x1="16" y1="12" x2="8" y2="12"></line>
                </svg>
            </button>

            <div class="modal-options mt-4">
                <div class="quiz-option-card" data-type="mcq">
                    <div class="option-icon">
                        <img src="../assets/icons/mcq_normal.svg" class="icon-normal">
                        <img src="../assets/icons/mcq_active.svg" class="icon-active">
                    </div>
                </div>

                <div class="quiz-option-card" data-type="id">
                    <div class="option-icon">
                        <img src="../assets/icons/id_normal.svg" class="icon-normal">
                        <img src="../assets/icons/id_active.svg" class="icon-active">
                    </div>  
                </div>
            </div>

            <div class="modal-footer mt-4" style="text-align: center;">
                <button class="btn-continue" id="continueBtn">Continue</button>
            </div>

        </div>
    </div>
`;

// --- 3. SETTINGS MODAL TEMPLATE ---
const settingsModalTemplate = `
    <div id="settingsModal" class="modal-overlay" style="display: none;">
        <div class="settings-modal glass-panel">
            <button class="btn-back" id="closeSettingsBtn" aria-label="Close settings">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FFF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>

            <h2 class="settings-title">Settings</h2>
            <p class="settings-subtitle">Customize your QuizCraft experience</p>

            <div class="settings-section">
                <div class="settings-item">
                    <div class="settings-item-info">
                        <h3>Smart Review</h3>
                        <p>AI-powered explanations for incorrect answers after quizzes</p>
                    </div>
                    <label class="switch" id="smartReviewToggle">
                        <input type="checkbox" id="smartReviewCheckbox" checked>
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>

            <div class="settings-actions">
                <button class="modal-btn" id="saveSettingsBtn">Save Changes</button>
            </div>

            <div class="settings-toast" id="settingsToast" style="display: none;"></div>
        </div>
    </div>
`;

// --- 4. INJECT INTO DOM ---
document.getElementById('navbar-container').innerHTML = navbarTemplate + modalTemplate + settingsModalTemplate;

// Store current user data for settings hydration
let _cachedUserData = null;

async function hydrateNavbar() {
    try {
        const res = await fetchWithAuth('/api/user');
        if (res.ok) {
            const userData = await res.json();
            _cachedUserData = userData;
            const uname = document.getElementById('nav-username');
            const uemail = document.getElementById('nav-email');
            if(uname) uname.textContent = userData.username || 'User';
            if(uemail && userData.email) uemail.textContent = userData.email;
        }
    } catch (err) {
        console.error("Error fetching user for navbar:", err);
    }
}
hydrateNavbar();


// --- 5. QUIZ TYPE MODAL LOGIC ---
setTimeout(() => {
    const openModalBtn = document.getElementById('openQuizModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modal = document.getElementById('quizTypeModal');
    const optionCards = document.querySelectorAll('.quiz-option-card');
    const continueBtn = document.getElementById('continueBtn');

    let selectedQuizType = null;

    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            optionCards.forEach(c => c.classList.remove('active'));
            selectedQuizType = null;
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            optionCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedQuizType = card.getAttribute('data-type');
        });
    });

    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            if (selectedQuizType) {
                window.location.href = `/create_quiz?type=${selectedQuizType}`; 
            } else {
                alert('Please select a quiz type first!');
            }
        });
    }

    // --- 6. SETTINGS MODAL LOGIC ---
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const smartReviewCheckbox = document.getElementById('smartReviewCheckbox');
    const settingsToast = document.getElementById('settingsToast');

    function showToast(message, isError = false) {
        settingsToast.textContent = message;
        settingsToast.className = `settings-toast ${isError ? 'toast-error' : 'toast-success'}`;
        settingsToast.style.display = 'block';
        setTimeout(() => {
            settingsToast.style.display = 'none';
        }, 3000);
    }

    // Open Settings Modal
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', async () => {
            // Hydrate the toggle with current user data
            if (_cachedUserData) {
                smartReviewCheckbox.checked = _cachedUserData.smartReview !== false;
            } else {
                // Fallback: fetch fresh data if cache is empty
                try {
                    const res = await fetchWithAuth('/api/user');
                    if (res.ok) {
                        _cachedUserData = await res.json();
                        smartReviewCheckbox.checked = _cachedUserData.smartReview !== false;
                    }
                } catch (e) {
                    console.error('Could not fetch user settings:', e);
                }
            }
            settingsModal.style.display = 'flex';
        });
    }

    // Close Settings Modal
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }

    // Save Settings
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            const smartReviewValue = smartReviewCheckbox.checked;

            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = 'Saving...';

            try {
                const res = await fetchWithAuth('/api/user/settings', {
                    method: 'PUT',
                    body: JSON.stringify({ smartReview: smartReviewValue })
                });

                if (res.ok) {
                    const data = await res.json();
                    // Update cached user data so reopening the modal reflects the change
                    if (_cachedUserData) {
                        _cachedUserData.smartReview = smartReviewValue;
                    }
                    showToast('Settings saved successfully!');
                } else {
                    const errorData = await res.json();
                    showToast(errorData.message || 'Failed to save settings.', true);
                }
            } catch (error) {
                console.error('Settings save error:', error);
                showToast('Network error. Please try again.', true);
            } finally {
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.textContent = 'Save Changes';
            }
        });
    }
}, 100);
