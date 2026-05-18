document.addEventListener('DOMContentLoaded', async () => {

    // ==========================================
    // 1. DYNAMIC USERNAME LOGIC
    // ==========================================
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payloadStr = atob(token.split('.')[1]);
            const payload = JSON.parse(payloadStr);
            const usernameSpan = document.getElementById('dynamic-username');
            if (usernameSpan && payload.username) {
                usernameSpan.textContent = payload.username;
            }
        } catch (err) {
            console.error("Failed to decode token:", err);
        }
    }

    // ==========================================
    // 1.5 JOIN QUIZ BY CODE
    // ==========================================
    const joinCodeInput = document.getElementById('joinCodeInput');
    const joinQuizBtn = document.getElementById('joinQuizBtn');
    const joinError = document.getElementById('joinError');

    async function handleJoinQuiz() {
        const code = joinCodeInput.value.trim().toUpperCase();
        joinError.style.display = 'none';

        if (!code || code.length < 4) {
            joinError.textContent = 'Please enter a valid quiz code.';
            joinError.style.display = 'block';
            return;
        }

        try {
            joinQuizBtn.textContent = 'Joining...';
            joinQuizBtn.disabled = true;

            const res = await fetchWithAuth(`/api/quizzes/${code}`);

            if (res.ok) {
                window.location.href = `/take_quiz?code=${code}`;
            } else {
                const data = await res.json();
                joinError.textContent = data.message || 'Quiz not found. Check the code and try again.';
                joinError.style.display = 'block';
            }
        } catch (err) {
            joinError.textContent = 'Connection error. Please try again.';
            joinError.style.display = 'block';
        }

        joinQuizBtn.textContent = 'Join Quiz';
        joinQuizBtn.disabled = false;
    }

    if (joinQuizBtn) joinQuizBtn.addEventListener('click', handleJoinQuiz);
    if (joinCodeInput) {
        joinCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleJoinQuiz();
        });
        // Auto-uppercase as user types
        joinCodeInput.addEventListener('input', () => {
            joinCodeInput.value = joinCodeInput.value.toUpperCase();
        });
    }

    // ==========================================
    // 2. STATE & DOM ELEMENTS
    // ==========================================
    let communityQuizzes = [];
    let myQuizzes = [];
    let currentActiveShareCode = null;

    // Pagination state
    const ITEMS_PER_PAGE = 8;
    let communityPage = 1;
    let communityTotalPages = 1;
    let myQuizzesPage = 1;
    let myQuizzesTotalPages = 1;

    // Grids & States
    const communityGrid = document.createElement('div'); // We'll inject this dynamically
    communityGrid.className = 'quiz-grid';
    const contentCommunity = document.getElementById('content-community');
    contentCommunity.appendChild(communityGrid);

    const communityPagination = document.getElementById('community-pagination');

    const myQuizzesGrid = document.getElementById('my-quizzes-grid');
    const myQuizzesEmpty = document.getElementById('my-quizzes-empty');
    const paginationWrapper = document.getElementById('my-quizzes-pagination');

    // Tabs
    const tabCommunity = document.getElementById('tab-community');
    const tabMyQuizzes = document.getElementById('tab-my-quizzes');
    const contentMyQuizzes = document.getElementById('content-my-quizzes');

    // Modals & Buttons
    const viewQuizModal = document.getElementById('viewQuizModal');
    const btnCloseView = document.getElementById('closeViewQuizBtn');
    const btnTakeQuiz = document.querySelector('.btn-take-quiz');
    const loadingOverlay = document.getElementById('quiz-loading-overlay');
    
    const editBtn = document.querySelector('.edit-btn');
    const deleteBtn = document.querySelector('.delete-btn');
    
    const editModal = document.getElementById('editModal');
    const confirmEditBtn = document.getElementById('confirmEdit');
    const cancelEditBtn = document.getElementById('cancelEdit');
    
    const deleteModal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');

    // ==========================================
    // 3. FETCH QUIZZES FROM API
    // ==========================================
    async function loadCommunityQuizzes() {
        try {
            const commRes = await fetchWithAuth('/api/quizzes/community');
            if (commRes.ok) {
                communityQuizzes = await commRes.json();
                communityTotalPages = Math.ceil(communityQuizzes.length / ITEMS_PER_PAGE) || 1;
                if (communityPage > communityTotalPages) communityPage = communityTotalPages;
            }
            renderCommunityQuizzes();
        } catch (error) {
            console.error("Error loading community quizzes:", error);
        }
    }

    async function loadMyQuizzes(page = 1) {
        try {
            const myRes = await fetchWithAuth(`/api/quizzes/my-quizzes?page=${page}&limit=${ITEMS_PER_PAGE}`);
            if (myRes.ok) {
                const data = await myRes.json();
                myQuizzes = data.quizzes;
                myQuizzesPage = data.currentPage;
                myQuizzesTotalPages = data.totalPages;
            }
            renderMyQuizzes();
        } catch (error) {
            console.error("Error loading my quizzes:", error);
        }
    }

    async function loadQuizzes() {
        await Promise.all([loadCommunityQuizzes(), loadMyQuizzes(1)]);
    }

    // ==========================================
    // 3.5 PAGINATION CONTROLS HELPER
    // ==========================================
    function renderPaginationControls(container, currentPage, totalPages, onPageChange) {
        if (!container) return;
        container.innerHTML = '';

        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
        prevBtn.disabled = currentPage <= 1;
        prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));

        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `${currentPage} / ${totalPages}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>';
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));

        container.appendChild(prevBtn);
        container.appendChild(pageInfo);
        container.appendChild(nextBtn);
    }

    // ==========================================
    // 4. RENDER LOGIC
    // ==========================================
    function renderCommunityQuizzes() {
        communityGrid.innerHTML = '';
        const communityEmpty = document.getElementById('community-empty');
        
        if (communityQuizzes.length > 0) {
            if (communityEmpty) communityEmpty.style.display = 'none';
            communityGrid.style.display = 'grid';

            // Client-side pagination: slice the array
            const start = (communityPage - 1) * ITEMS_PER_PAGE;
            const pageItems = communityQuizzes.slice(start, start + ITEMS_PER_PAGE);

            pageItems.forEach(quiz => {
                const card = createQuizCard(quiz);
                communityGrid.appendChild(card);
            });

            renderPaginationControls(communityPagination, communityPage, communityTotalPages, (newPage) => {
                communityPage = newPage;
                renderCommunityQuizzes();
            });
        } else {
            if (communityEmpty) communityEmpty.style.display = 'flex';
            communityGrid.style.display = 'none';
            if (communityPagination) communityPagination.style.display = 'none';
        }
    }

    function renderMyQuizzes() {
        myQuizzesGrid.innerHTML = '';
        
        if (myQuizzes.length === 0 && myQuizzesPage === 1) {
            myQuizzesEmpty.style.display = 'flex';
            myQuizzesGrid.style.display = 'none';
            if (paginationWrapper) paginationWrapper.style.display = 'none';
            return;
        }

        myQuizzesEmpty.style.display = 'none';
        myQuizzesGrid.style.display = 'grid';

        myQuizzes.forEach(quiz => {
            const card = createQuizCard(quiz);
            myQuizzesGrid.appendChild(card);
        });

        // Re-use the existing pagination wrapper for My Quizzes
        renderPaginationControls(paginationWrapper, myQuizzesPage, myQuizzesTotalPages, (newPage) => {
            loadMyQuizzes(newPage);
        });
    }

    function createQuizCard(quiz) {
        const card = document.createElement('div');
        card.className = 'quiz-card';
        // Store the actual shareCode in data attribute
        card.setAttribute('data-id', quiz.shareCode);
        
        const creatorName = quiz.creatorId?.username || 'Unknown';
        const imgSrc = quiz.thumbnail ? quiz.thumbnail : '../assets/background.svg';
        
        card.innerHTML = `
            <img src="${imgSrc}" alt="Quiz Cover">
            <div class="quiz-card-content">
                <h3 class="qc-title">${quiz.title}</h3>
                <p class="qc-meta">
                    Share Code: ${quiz.shareCode}
                    <button class="copy-code-btn" data-code="${quiz.shareCode}" title="Copy code">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#09FFF3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </p>
                <p class="qc-creator">Creator: <span class="highlight-cyan">${creatorName}</span></p>
            </div>
        `;

        card.addEventListener('click', (e) => {
            // If the copy button was clicked, copy to clipboard instead of opening the modal
            const copyBtn = e.target.closest('.copy-code-btn');
            if (copyBtn) {
                e.stopPropagation();
                navigator.clipboard.writeText(copyBtn.dataset.code);
                copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#09FFF3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                }, 1500);
                return;
            }

            const shareCode = e.currentTarget.getAttribute('data-id');
            openViewModal(quiz, shareCode);
        });

        return card;
    }

    // ==========================================
    // 5. MODAL & ROUTING LOGIC
    // ==========================================
    function openViewModal(quiz, shareCode) {
        currentActiveShareCode = shareCode;
        document.getElementById('modal-title').textContent = quiz.title;
        document.getElementById('modal-creator').textContent = quiz.creatorId?.username || 'Unknown';
        document.getElementById('modal-questions').textContent = quiz.questionCount || '—';
        document.getElementById('modal-type').textContent = quiz.isPublic ? 'Public' : 'Private';
        document.getElementById('modal-desc').textContent = `Join using code: ${shareCode}`;
        document.getElementById('modal-img').src = quiz.thumbnail || '../assets/background.svg';
        
        // Conditionally show/hide edit, delete, and view-attempts buttons based on ownership
        const dynamicUsername = document.getElementById('dynamic-username')?.textContent;
        const creatorUsername = quiz.creatorId?.username;
        const isOwner = dynamicUsername === creatorUsername;
        
        if (editBtn && deleteBtn) {
            if (isOwner) {
                editBtn.style.display = '';
                deleteBtn.style.display = '';
            } else {
                editBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
            }
        }

        // Show "View Attempts" only for quiz owner
        const btnViewAttempts = document.getElementById('btnViewAttempts');
        if (btnViewAttempts) {
            btnViewAttempts.style.display = isOwner ? '' : 'none';
        }
        
        viewQuizModal.style.display = 'flex';
    }

    if (btnCloseView) {
        btnCloseView.addEventListener('click', () => { 
            viewQuizModal.style.display = 'none'; 
            currentActiveShareCode = null; 
        });
    }

    if (btnTakeQuiz && loadingOverlay) {
        btnTakeQuiz.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentActiveShareCode) return;

            viewQuizModal.style.display = 'none';
            document.body.style.overflow = 'hidden';
            loadingOverlay.style.display = 'flex';

            // Redirect using the shareCode
            setTimeout(() => { 
                window.location.href = `/take_quiz?code=${currentActiveShareCode}`;
            }, 2000);
        });
    }

    // --- NEW MODAL & BUTTON LOGIC ---
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (editModal) editModal.style.display = 'flex';
        });
    }
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (editModal) editModal.style.display = 'none';
        });
    }
    if (confirmEditBtn) {
        confirmEditBtn.addEventListener('click', () => {
            if (currentActiveShareCode) {
                window.location.href = `/edit_quiz?code=${currentActiveShareCode}`;
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (deleteModal) deleteModal.style.display = 'flex';
        });
    }
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            if (deleteModal) deleteModal.style.display = 'none';
        });
    }
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!currentActiveShareCode) return;
            
            try {
                const response = await fetchWithAuth(`/api/quizzes/${currentActiveShareCode}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    if (deleteModal) deleteModal.style.display = 'none';
                    if (viewQuizModal) viewQuizModal.style.display = 'none';
                    currentActiveShareCode = null;
                    
                    // Re-fetch to get correct paginated data
                    await loadQuizzes();
                } else {
                    const errorData = await response.json();
                    alert(`Failed to delete quiz: ${errorData.message}`);
                }
            } catch (error) {
                console.error("Error deleting quiz:", error);
                alert("An error occurred while deleting the quiz.");
            }
        });
    }

    // ==========================================
    // 5.5 VIEW ATTEMPTS MODAL LOGIC
    // ==========================================
    const attemptsModal = document.getElementById('attemptsModal');
    const attemptsBody = document.getElementById('attemptsBody');
    const attemptsQuizTitle = document.getElementById('attempts-quiz-title');
    const closeAttemptsBtn = document.getElementById('closeAttemptsBtn');
    const btnViewAttempts = document.getElementById('btnViewAttempts');

    if (btnViewAttempts) {
        btnViewAttempts.addEventListener('click', async () => {
            if (!currentActiveShareCode) return;

            // Show the modal with loading state
            const quizTitle = document.getElementById('modal-title')?.textContent || 'Quiz';
            if (attemptsQuizTitle) attemptsQuizTitle.textContent = quizTitle;
            if (attemptsBody) attemptsBody.innerHTML = '<div class="attempts-empty">Loading attempts...</div>';
            if (attemptsModal) attemptsModal.style.display = 'flex';

            try {
                const res = await fetchWithAuth(`/api/quizzes/${currentActiveShareCode}/attempts`);
                if (!res.ok) {
                    const errData = await res.json();
                    attemptsBody.innerHTML = `<div class="attempts-empty">${errData.message || 'Failed to load attempts.'}</div>`;
                    return;
                }

                const attempts = await res.json();

                if (attempts.length === 0) {
                    attemptsBody.innerHTML = '<div class="attempts-empty">No one has attempted this quiz yet.</div>';
                    return;
                }

                // Build table
                let tableHTML = `
                    <table class="attempts-table">
                        <thead>
                            <tr>
                                <th>Taker</th>
                                <th>Score</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>`;

                attempts.forEach(a => {
                    const scoreClass = a.percent >= 80 ? 'score-high' : a.percent >= 50 ? 'score-mid' : 'score-low';
                    const dateStr = new Date(a.completedAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });

                    tableHTML += `
                        <tr>
                            <td class="attempt-taker">${a.takerName}</td>
                            <td><span class="attempt-score ${scoreClass}">${a.score}/${a.totalQuestions} (${a.percent}%)</span></td>
                            <td class="attempt-date">${dateStr}</td>
                        </tr>`;
                });

                tableHTML += '</tbody></table>';
                attemptsBody.innerHTML = tableHTML;

            } catch (err) {
                console.error('Error loading attempts:', err);
                attemptsBody.innerHTML = '<div class="attempts-empty">Connection error. Please try again.</div>';
            }
        });
    }

    if (closeAttemptsBtn) {
        closeAttemptsBtn.addEventListener('click', () => {
            if (attemptsModal) attemptsModal.style.display = 'none';
        });
    }

    // ==========================================
    // 6. TAB SWITCHING LOGIC
    // ==========================================
    if (tabCommunity && tabMyQuizzes) {
        tabCommunity.addEventListener('click', () => {
            tabCommunity.classList.add('active');
            tabMyQuizzes.classList.remove('active');
            contentCommunity.style.display = 'block';
            contentMyQuizzes.style.display = 'none';
        });

        tabMyQuizzes.addEventListener('click', () => {
            tabMyQuizzes.classList.add('active');
            tabCommunity.classList.remove('active');
            contentMyQuizzes.style.display = 'block';
            contentCommunity.style.display = 'none';
        });
    }

    // ==========================================
    // 6.5. ADMIN ROLE: HIDE MY QUIZZES TAB
    // ==========================================
    let userRole = 'user';
    try {
        const tokenForRole = localStorage.getItem('token');
        if (tokenForRole) {
            const rolePayload = JSON.parse(atob(tokenForRole.split('.')[1]));
            userRole = rolePayload.role || 'user';
        }
    } catch (err) { /* ignore decode errors */ }

    if (userRole === 'admin' && tabMyQuizzes && tabCommunity) {
        // Hide the My Quizzes tab entirely for admins
        tabMyQuizzes.style.display = 'none';
        // Default to Community tab
        tabCommunity.click();
    }

    // Logout Modal Logic (Retained)
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');
    if (cancelLogout) cancelLogout.addEventListener('click', () => logoutModal.style.display = 'none');
    if (confirmLogout) confirmLogout.addEventListener('click', () => { 
        localStorage.removeItem('token');
        window.location.href = '/login'; 
    });

    // Initial Load
    loadQuizzes();
    // For non-admin users, default to My Quizzes tab
    if (userRole !== 'admin' && tabMyQuizzes) tabMyQuizzes.click();
});