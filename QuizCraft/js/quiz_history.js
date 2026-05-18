document.addEventListener('DOMContentLoaded', () => {

    // 1. BACK BUTTON LOGIC
    const btnBack = document.getElementById('btn-back-dashboard');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = '/dashboard';
        });
    }

    // 2. DYNAMIC HISTORY DATA
    let userHistory = [];

    async function loadHistory() {
        try {
            const res = await fetchWithAuth('/api/user/history');
            if (res.ok) {
                userHistory = await res.json();
                renderHistoryCards();
            }
        } catch (error) {
            console.error("Error loading history:", error);
        }
    }

    // --- PAGINATION STATE ---
    let currentPage = 1;
    const itemsPerPage = 8;
    
    const historyGrid = document.getElementById('history-grid');
    const paginationContainer = document.querySelector('.qh-pagination-container');

    // 3. RENDER CARDS
    function renderHistoryCards() {
        historyGrid.innerHTML = ''; // Clear grid

        if (userHistory.length === 0) {
            historyGrid.innerHTML = `
                <div style="width: 100%; text-align: center; grid-column: 1 / -1; padding: 40px 0;">
                    <h3 style="color: #00FFF6; margin-bottom: 10px;">No History Found</h3>
                    <p style="color: #aaa;">You haven't taken any quizzes yet. Head to the dashboard to get started!</p>
                </div>
            `;
            if(paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        // Calculate the slice for the current page (e.g., indexes 0-9 for page 1)
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentItems = userHistory.slice(startIndex, endIndex);

        currentItems.forEach(attempt => {
            const degrees = (attempt.percent / 100) * 360;

            const cardHTML = `
                <div class="qh-card" onclick="window.location.href='/quiz_result?id=${attempt._id}'" style="cursor: pointer;">
                    <div class="qh-score-ring" style="background: conic-gradient(#00FFF6 ${degrees}deg, rgba(0, 255, 246, 0.1) 0deg);">
                        <div class="qh-score-inner">
                            ${attempt.score}/${attempt.totalQuestions}
                        </div>
                    </div>

                    <div class="qh-card-info">
                        <span class="qh-username">${escapeHTML(attempt.quizTitle || 'Quiz Attempt')}</span>
                        <span class="qh-date">Date: ${new Date(attempt.completedAt).toLocaleDateString()}</span>
                    </div>

                    <div class="qh-percent">${attempt.percent}%</div>
                </div>
            `;
            
            historyGrid.insertAdjacentHTML('beforeend', cardHTML);
        });

        // Rebuild the buttons below the grid
        renderPagination();
    }

    // 4. RENDER PAGINATION BUTTONS
    function renderPagination() {
        if (!paginationContainer) return;

        const totalPages = Math.ceil(userHistory.length / itemsPerPage);
        
        // Clear existing buttons
        paginationContainer.innerHTML = ''; 

        // Hide pagination completely if there are 10 or fewer items
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        } else {
            paginationContainer.style.display = 'flex';
        }

        // --- PREVIOUS ARROW ---
        const prevBtn = document.createElement('button');
        prevBtn.className = `qr-page-btn arrow-btn ${currentPage === 1 ? 'disabled' : ''}`;
        prevBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="#00FFF6" stroke="none" width="16" height="16" style="transform: rotate(180deg);">
                <polygon points="5 3 19 12 5 21"></polygon>
            </svg>`;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderHistoryCards();
            }
        };
        paginationContainer.appendChild(prevBtn);

        // --- PAGE NUMBERS ---
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `qr-page-btn ${currentPage === i ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                currentPage = i;
                renderHistoryCards();
            };
            paginationContainer.appendChild(pageBtn);
        }

        // --- NEXT ARROW ---
        const nextBtn = document.createElement('button');
        nextBtn.className = `qr-page-btn arrow-btn ${currentPage === totalPages ? 'disabled' : ''}`;
        nextBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="#00FFF6" stroke="none" width="16" height="16">
                <polygon points="5 3 19 12 5 21"></polygon>
            </svg>`;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderHistoryCards();
            }
        };
        paginationContainer.appendChild(nextBtn);
    }

    // Initialize the first load
    loadHistory();
});

// 5. ESCAPE HTML HELPER (Security)
function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}