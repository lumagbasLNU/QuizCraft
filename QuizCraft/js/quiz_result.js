// =====================================================================
// Dynamically hydrated with real data from /api/user/history
// =====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // Navigation and Action Buttons
    const btnBack = document.getElementById('btn-back-dashboard');
    const btnRetake = document.getElementById('btn-retake');
    const btnHistory = document.getElementById('btn-history');

    // Modal elements
    const retakeModal = document.getElementById('retakeModal');
    const confirmRetake = document.getElementById('confirmRetake');
    const cancelRetake = document.getElementById('cancelRetake');
    
    // Smart Review Modal elements
    const srModalOverlay = document.getElementById('smart-review-modal');
    const btnCloseSr = document.getElementById('btn-close-sr');

    // Setup basic navigation
    if (btnBack) btnBack.addEventListener('click', () => window.location.href = '/dashboard');
    if (btnHistory) btnHistory.addEventListener('click', () => window.location.href = '/quiz_history');

    // --- RETAKE MODAL LOGIC ---
    if (btnRetake) {
        btnRetake.addEventListener('click', () => {
            retakeModal.style.display = 'flex';
        });
    }

    if (cancelRetake) {
        cancelRetake.addEventListener('click', () => {
            retakeModal.style.display = 'none';
        });
    }

    // --- SMART REVIEW MODAL LOGIC ---
    if (btnCloseSr) {
        btnCloseSr.addEventListener('click', () => {
            srModalOverlay.style.display = 'none';
        });
    }

    if (srModalOverlay) {
        srModalOverlay.addEventListener('click', (e) => {
            if (e.target === srModalOverlay) {
                srModalOverlay.style.display = 'none';
            }
        });
    }

    // --- FETCH DATA ---
    const urlParams = new URLSearchParams(window.location.search);
    const attemptId = urlParams.get('id');
    let attemptData = null;

    try {
        const res = await fetchWithAuth('/api/user/history');
        if (res.ok) {
            const historyData = await res.json();
            if (historyData.length > 0) {
                if (attemptId) {
                    attemptData = historyData.find(a => a._id === attemptId);
                } else {
                    attemptData = historyData[0]; // fallback to most recent
                }
            }
        }
    } catch (error) {
        console.error("Error fetching result data:", error);
    }

    // Safety check
    if (!attemptData) {
        document.getElementById('qr-quiz-title').textContent = "Unknown Quiz";
        document.getElementById('qr-results-list').innerHTML = "<p style='color: white;'>No recent quiz data found.</p>";
        if(btnRetake) {
            btnRetake.textContent = "Exit Page";
            btnRetake.addEventListener('click', () => window.location.href = '/dashboard');
        }
        if(cancelRetake) cancelRetake.parentElement.innerHTML = ""; 
        return;
    }

    // Setup Header & Modal Confirm
    document.getElementById('qr-quiz-title').textContent = attemptData.quizTitle || "Quiz Result";
    // For retake, we ideally need the shareCode, but we only have quizId. We'll just route to dashboard for now if missing.
    if (confirmRetake) {
        confirmRetake.addEventListener('click', () => {
            window.location.href = '/dashboard';
        });
    }

    // ---------------------------------------------------------------------
    // --- PAGINATION & RENDERING LOGIC ---
    // ---------------------------------------------------------------------
    const itemsPerPage = 5;
    let currentPage = 1;
    // We only have smartReviewData for incorrect answers. So we list those.
    const incorrectQuestions = attemptData.smartReviewData || [];
    const totalReviewItems = incorrectQuestions.length;
    const totalPages = Math.ceil(totalReviewItems / itemsPerPage);

    const listContainer = document.getElementById('qr-results-list');
    const paginationContainer = document.getElementById('qr-pagination-container');

    function renderList(page) {
        listContainer.innerHTML = '';
        
        if (totalReviewItems === 0) {
            listContainer.innerHTML = "<p style='color: #00FFF6; font-size: 1.2rem; text-align: center; margin-top: 20px;'>Perfect score! No incorrect answers to review.</p>";
            return;
        }

        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalReviewItems);
        const pageData = incorrectQuestions.slice(startIndex, endIndex);

        pageData.forEach((q, index) => {
            const absoluteQuestionNumber = startIndex + index + 1;
            const trueArrayIndex = startIndex + index; 

            // They are all incorrect if they are in smartReviewData
            const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#ff4b4b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            const userAnsColor = '#ff4b4b';

            const cardHTML = `
                <div class="qr-result-card">
                    <div class="qr-card-left">
                        <div class="qr-icon">${iconSvg}</div>
                        <div class="qr-text">
                            <h4>Review ${absoluteQuestionNumber}: ${q.questionText}</h4>
                            <p>User Answer: <span style="color: ${userAnsColor};">${q.userAnswer}</span></p>
                            <p style="color: #bbb; font-style: italic; margin-top: 5px; font-size: 0.9em;">AI: ${q.explanation}</p>
                            <a href="${q.searchLink}" target="_blank" style="display:inline-block; margin-top: 5px; color: #00FFF6; text-decoration: none; font-size: 0.9em;">Learn More on Google</a>
                        </div>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'qr-page-btn arrow-btn';
        prevBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M15 18l-6-6 6-6"/></svg>`;
        
        if (currentPage === 1) {
            prevBtn.disabled = true;
            prevBtn.classList.add('disabled');
        } else {
            prevBtn.addEventListener('click', () => {
                currentPage--;
                renderList(currentPage);
                renderPagination();
            });
        }
        paginationContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `qr-page-btn ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            
            btn.addEventListener('click', () => {
                currentPage = i;
                renderList(currentPage);
                renderPagination(); 
            });
            
            paginationContainer.appendChild(btn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'qr-page-btn arrow-btn';
        nextBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M9 18l6-6-6-6"/></svg>`;
        
        if (currentPage === totalPages) {
            nextBtn.disabled = true;
            nextBtn.classList.add('disabled');
        } else {
            nextBtn.addEventListener('click', () => {
                currentPage++;
                renderList(currentPage);
                renderPagination();
            });
        }
        paginationContainer.appendChild(nextBtn);
    }
    
    renderList(currentPage);
    renderPagination();

    // ---------------------------------------------------------------------
    // --- CALCULATE SCORE ---
    // ---------------------------------------------------------------------
    const correctAnswers = attemptData.score;
    const totalQuestionsOverall = attemptData.totalQuestions;
    const percentage = attemptData.percent;
    const degrees = (percentage / 100) * 360;

    document.getElementById('qr-score-fraction').textContent = `${correctAnswers}/${totalQuestionsOverall}`;
    document.getElementById('qr-score-percent').textContent = `${percentage}%`;
    
    // Animates the circle drawing itself
    setTimeout(() => {
        const circle = document.getElementById('qr-score-circle');
        if(circle) circle.style.setProperty('--progress', `${degrees}deg`);
    }, 100);
});