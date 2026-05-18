document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. DYNAMIC ADMIN PROFILE NAME
    // ==========================================
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const payloadStr = atob(token.split('.')[1]);
            const payload = JSON.parse(payloadStr);
            const nameEl = document.getElementById('admin-profile-name');
            if (nameEl && payload.username) nameEl.textContent = payload.username;
        }
    } catch(err) { console.error("Token decode failed", err); }

    // Logout button clears token
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            localStorage.removeItem('token');
        });
    }

    // ==========================================
    // 2. FETCH & DISPLAY ADMIN STATS (KPI Cards)
    // ==========================================
    async function loadAdminStats() {
        try {
            const res = await fetchWithAuth('/api/admin/stats');
            if (res.ok) {
                const stats = await res.json();
                const elUsers = document.getElementById('stat-total-users');
                const elQuizzes = document.getElementById('stat-total-quizzes');

                if (elUsers) elUsers.textContent = stats.totalUsers;
                if (elQuizzes) elQuizzes.textContent = stats.totalQuizzes;
            }
        } catch(err) { console.error("Error loading admin stats:", err); }
    }

    // ==========================================
    // 3. QUIZ TABLE — STATE & DOM REFS
    // ==========================================
    const tableBody = document.getElementById('quiz-table-body');
    const tableEmpty = document.getElementById('quiz-table-empty');
    const tableContainer = document.querySelector('.table-container');
    const paginationContainer = document.getElementById('auto-pagination');

    const deleteModalOverlay = document.getElementById('delete-modal-overlay');
    const deleteQuizTitleSpan = document.getElementById('delete-quiz-title');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');

    let allQuizzes = [];        // Full dataset from API
    let pendingDeleteCode = null; // Share code of quiz awaiting delete confirmation
    const itemsPerPage = 5;
    let currentPage = 1;

    // ==========================================
    // 4. FETCH ALL QUIZZES FROM API
    // ==========================================
    async function loadAllQuizzes() {
        try {
            const res = await fetchWithAuth('/api/admin/quizzes');
            if (res.ok) {
                allQuizzes = await res.json();
                renderQuizTable();
            } else {
                console.error("Failed to load quizzes:", res.status);
            }
        } catch(err) { console.error("Error loading quizzes:", err); }
    }

    // ==========================================
    // 5. RENDER QUIZ TABLE
    // ==========================================
    function renderQuizTable() {
        tableBody.innerHTML = '';

        if (allQuizzes.length === 0) {
            tableEmpty.style.display = 'flex';
            tableContainer.style.display = 'none';
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        tableEmpty.style.display = 'none';
        tableContainer.style.display = 'block';

        allQuizzes.forEach(quiz => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', quiz.shareCode);

            const creatorName = quiz.creatorId?.username || 'Unknown';
            const thumbSrc = quiz.thumbnail || '../assets/background.svg';
            const visibilityLabel = quiz.isPublic ? 'Public' : 'Private';

            row.innerHTML = `
                <td>
                    <div class="quiz-cell">
                        <img src="${thumbSrc}" alt="Thumbnail" class="quiz-thumb">
                        <div class="quiz-meta">
                            <h4 class="quiz-title">${quiz.title}</h4>
                            <span class="quiz-id">Code: ${quiz.shareCode}</span>
                        </div>
                    </div>
                </td>
                <td><span class="creator-name">${creatorName}</span></td>
                <td><span class="category-pill">${visibilityLabel}</span></td>
                <td>
                    <div class="action-cell">
                        <button class="action-btn-edit" data-code="${quiz.shareCode}">Edit</button>
                        <button class="action-btn-delete" data-code="${quiz.shareCode}" data-title="${quiz.title}">Delete</button>
                    </div>
                </td>
            `;

            tableBody.appendChild(row);
        });

        // Apply pagination after rendering
        updatePaginatedView();
    }

    // ==========================================
    // 6. PAGINATION LOGIC
    // ==========================================
    function updatePaginatedView() {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const totalPages = Math.ceil(rows.length / itemsPerPage);

        // Clamp currentPage
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        // Show/Hide Rows
        rows.forEach((row, index) => {
            row.style.display = (index >= start && index < end) ? 'table-row' : 'none';
        });

        // Render Pagination
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        if (!paginationContainer) return;

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';
        paginationContainer.innerHTML = '';

        // Previous Arrow
        const prevArrow = document.createElement('a');
        prevArrow.href = '#';
        prevArrow.className = `page-arrow ${currentPage === 1 ? 'disabled' : ''}`;
        prevArrow.style.transform = 'rotate(180deg)';
        prevArrow.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#09FFF3"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        prevArrow.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) { currentPage--; updatePaginatedView(); }
        });
        paginationContainer.appendChild(prevArrow);

        // Numbered Buttons
        for (let i = 1; i <= totalPages; i++) {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.className = `page-num ${i === currentPage ? 'active' : ''}`;
            pageLink.textContent = i;
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                updatePaginatedView();
            });
            paginationContainer.appendChild(pageLink);
        }

        // Next Arrow
        const nextArrow = document.createElement('a');
        nextArrow.href = '#';
        nextArrow.className = `page-arrow ${currentPage === totalPages ? 'disabled' : ''}`;
        nextArrow.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#09FFF3"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        nextArrow.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) { currentPage++; updatePaginatedView(); }
        });
        paginationContainer.appendChild(nextArrow);
    }

    // ==========================================
    // 7. ACTION HANDLERS (Event Delegation)
    // ==========================================
    if (tableBody) {
        tableBody.addEventListener('click', function(e) {
            const target = e.target.closest('button');
            if (!target) return;

            // EDIT ACTION
            if (target.classList.contains('action-btn-edit')) {
                const shareCode = target.getAttribute('data-code');
                window.location.href = `/edit_quiz?code=${shareCode}`;
            }

            // DELETE ACTION — Open modal
            if (target.classList.contains('action-btn-delete')) {
                pendingDeleteCode = target.getAttribute('data-code');
                const quizTitle = target.getAttribute('data-title') || 'this quiz';
                if (deleteQuizTitleSpan) deleteQuizTitleSpan.textContent = quizTitle;
                if (deleteModalOverlay) deleteModalOverlay.style.display = 'flex';
            }
        });
    }

    // ==========================================
    // 8. DELETE MODAL HANDLERS
    // ==========================================
    if (btnCancelDelete) {
        btnCancelDelete.addEventListener('click', () => {
            deleteModalOverlay.style.display = 'none';
            pendingDeleteCode = null;
        });
    }

    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            if (!pendingDeleteCode) return;

            btnConfirmDelete.textContent = 'Deleting...';
            btnConfirmDelete.disabled = true;

            try {
                const res = await fetchWithAuth(`/api/quizzes/${pendingDeleteCode}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    // Remove from local array and re-render
                    allQuizzes = allQuizzes.filter(q => q.shareCode !== pendingDeleteCode);
                    renderQuizTable();

                    // Refresh stats (total quizzes count changed)
                    loadAdminStats();
                } else {
                    const errData = await res.json();
                    alert(`Failed to delete: ${errData.message}`);
                }
            } catch(err) {
                console.error("Error deleting quiz:", err);
                alert("An error occurred while deleting the quiz.");
            }

            // Reset modal state
            deleteModalOverlay.style.display = 'none';
            pendingDeleteCode = null;
            btnConfirmDelete.textContent = 'Delete';
            btnConfirmDelete.disabled = false;
        });
    }

    // ==========================================
    // 9. QUIZ TYPE SELECTION MODAL
    // ==========================================
    const quizTypeModalOverlay = document.getElementById('quiz-type-modal-overlay');
    const createQuizBtn = document.getElementById('create-quiz-btn');
    const btnCreateMcq = document.getElementById('btn-create-mcq');
    const btnCreateId = document.getElementById('btn-create-id');
    const btnCancelQuizType = document.getElementById('btn-cancel-quiz-type');

    if (createQuizBtn && quizTypeModalOverlay) {
        createQuizBtn.addEventListener('click', () => {
            quizTypeModalOverlay.style.display = 'flex';
        });
    }

    if (btnCreateMcq) {
        btnCreateMcq.addEventListener('click', () => {
            window.location.href = '/create_quiz?type=mcq';
        });
    }

    if (btnCreateId) {
        btnCreateId.addEventListener('click', () => {
            window.location.href = '/create_quiz?type=id';
        });
    }

    if (btnCancelQuizType) {
        btnCancelQuizType.addEventListener('click', () => {
            quizTypeModalOverlay.style.display = 'none';
        });
    }

    // ==========================================
    // 10. INITIAL LOAD
    // ==========================================
    loadAdminStats();
    loadAllQuizzes();
});