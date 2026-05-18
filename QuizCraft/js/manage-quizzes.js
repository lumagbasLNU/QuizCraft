document.addEventListener('DOMContentLoaded', () => {
    
    const tableBody = document.getElementById('quiz-table-body');
    const paginationContainer = document.getElementById('auto-pagination');
    
    // Configuration
    const itemsPerPage = 5; 
    let currentPage = 1;

    /**
     * CORE VIEW LOGIC
     * Handles displaying the correct rows and regenerating pagination buttons.
     */
    function updateView() {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const totalPages = Math.ceil(rows.length / itemsPerPage);
        
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        // 1. Show/Hide Rows
        rows.forEach((row, index) => {
            if (index >= start && index < end) {
                row.style.display = 'table-row';
            } else {
                row.style.display = 'none';
            }
        });

        // 2. Render Pagination Buttons
        renderPagination(totalPages);
    }

    /**
     * PAGINATION RENDERER
     * Dynamically creates the UI for page navigation.
     */
    function renderPagination(totalPages) {
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
            if (currentPage > 1) {
                currentPage--;
                updateView();
            }
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
                updateView();
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
            if (currentPage < totalPages) {
                currentPage++;
                updateView();
            }
        });

        paginationContainer.appendChild(nextArrow);
    }

    /**
     * GLOBAL ACTION HANDLER (Event Delegation)
     * Handles clicks for Delete, Edit, and View buttons regardless of which page they are on.
     * * =========================================================
     * BACKEND NOTE: API Integration for Quiz Actions
     * 1. DELETE: Instead of just row.remove(), send a DELETE 
     * request to /api/quizzes/:id. Only remove the row from 
     * the UI if the server returns a 200 OK.
     * 2. EDIT: Use the clean route /edit-quiz/:id to navigate 
     * to the editor.
     * 3. VIEW: Fetch the specific quiz data to populate a 
     * preview modal or redirect to /quiz/:id.
     * =========================================================
     */
    tableBody.addEventListener('click', function(e) {
        // Find if a button was clicked
        const target = e.target.closest('button');
        if (!target) return;

        const row = target.closest('tr');
        const quizTitle = row.querySelector('.quiz-title').textContent;

        // DELETE ACTION
        if (target.classList.contains('delete-btn')) {
            if (confirm(`Are you sure you want to delete "${quizTitle}"?`)) {
                row.style.transition = "opacity 0.4s ease, transform 0.4s ease";
                row.style.opacity = "0";
                row.style.transform = "translateX(20px)";
                
                setTimeout(() => { 
                    row.remove(); 
                    // Adjust current page if we deleted the last item on a page
                    const remainingRows = tableBody.querySelectorAll('tr').length;
                    const newMaxPage = Math.ceil(remainingRows / itemsPerPage);
                    if (currentPage > newMaxPage && newMaxPage > 0) {
                        currentPage = newMaxPage;
                    }
                    updateView(); 
                }, 400);
            }
        }

        // VIEW ACTION
        if (target.classList.contains('view-btn')) {
            const shareCode = row.dataset.id || 'unknown';
            window.location.href = `/take_quiz?code=${shareCode}`;
        }

        // EDIT ACTION
        if (target.classList.contains('edit-btn')) {
            const shareCode = row.dataset.id || 'unknown';
            window.location.href = `/edit_quiz?code=${shareCode}`;
        }
    });

    // Initialize the first view
    updateView();
});