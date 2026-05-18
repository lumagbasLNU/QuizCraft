document.addEventListener('DOMContentLoaded', () => {
    
    // --- ADD THIS HELPER FUNCTION ---
    function escapeHTML(str) {
        if (!str) return "";
        return String(str).replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    // -------------------------------------------------------------
    // 1. DETERMINE QUIZ TYPE FROM URL 
    // Example: create_quiz.html?type=mcq OR create_quiz.html?type=id
    // -------------------------------------------------------------
    const urlParams = new URLSearchParams(window.location.search);
    let quizType = urlParams.get('type') || 'mcq'; // Defaults to mcq if missing

    // Optional: Update the page title dynamically
    const pageTitle = document.getElementById('quiz-page-title');
    if (pageTitle) {
        pageTitle.textContent = quizType === 'id' ? 'Create Identification Quiz' : 'Create Multiple Choice Quiz';
    }

    // -------------------------------------------------------------
    // 1.5. DETECT USER ROLE FROM JWT
    // -------------------------------------------------------------
    let userRole = 'user';
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.role || 'user';
        }
    } catch (err) { /* ignore decode errors */ }

    // If admin, hide the privacy dropdown (admin quizzes are always public)
    if (userRole === 'admin') {
        const privacyGroup = document.getElementById('quiz-privacy');
        if (privacyGroup && privacyGroup.closest('.form-group')) {
            privacyGroup.closest('.form-group').style.display = 'none';
        }
    }

    // -------------------------------------------------------------
    // 2. THUMBNAIL UPLOAD LOGIC
    // -------------------------------------------------------------
    const fileInput = document.getElementById('thumbnail-upload');
    const iconTrigger = document.getElementById('icon-upload-trigger');
    const btnTrigger = document.getElementById('btn-upload-trigger');

    if (fileInput && iconTrigger && btnTrigger) {
        iconTrigger.addEventListener('click', () => fileInput.click());
        btnTrigger.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                const uploadTitle = document.querySelector('.upload-title');
                uploadTitle.textContent = fileName;
                uploadTitle.style.color = '#00FFF6';
            }
        });
    }

    // -------------------------------------------------------------
    // 3. DYNAMIC QUESTION ADDITION LOGIC
    // -------------------------------------------------------------
    const btnAddQuestion = document.getElementById('add-question-btn');
    const questionsContainer = document.getElementById('questions-container');
    const emptyState = document.getElementById('empty-state');
    let questionCounter = 0;

    if (btnAddQuestion) {
        btnAddQuestion.addEventListener('click', () => {
            questionCounter++;

            if (emptyState) emptyState.style.display = 'none';

            const questionBlock = document.createElement('div');
            questionBlock.className = 'question-block glass-panel mt-2';

            // --- BUILD THE HTML STRING BASED ON QUIZ TYPE ---
            let questionHTML = `
                <div class="question-header">
                    <h3 class="question-number">Question ${questionCounter}</h3>
                    <button type="button" class="btn-remove">Remove</button>
                </div>
                <div class="form-group mt-2">
                    <label>Question Text</label>
                    <input type="text" class="custom-input" placeholder="Enter your question...">
                </div>
            `;

            if (quizType === 'id') {
                // IDENTIFICATION SPECIFIC INPUT
                questionHTML += `
                <div class="form-group mt-2">
                    <label>Correct Answer</label>
                    <input type="text" class="custom-input" placeholder="Enter the exact correct answer...">
                </div>`;
            } else {
                // MULTIPLE CHOICE SPECIFIC INPUTS
                questionHTML += `
                <div class="form-group mt-2">
                    <label>Answer Options <span class="label-subtext">(Click the circle of the correct answer)</span></label>
                    <div class="mcq-grid mt-1">
                        <div class="mcq-option">
                            <input type="radio" name="q${questionCounter}-correct" class="mcq-radio">
                            <input type="text" class="custom-input" placeholder="Option A">
                        </div>
                        <div class="mcq-option">
                            <input type="radio" name="q${questionCounter}-correct" class="mcq-radio">
                            <input type="text" class="custom-input" placeholder="Option B">
                        </div>
                        <div class="mcq-option">
                            <input type="radio" name="q${questionCounter}-correct" class="mcq-radio">
                            <input type="text" class="custom-input" placeholder="Option C">
                        </div>
                        <div class="mcq-option">
                            <input type="radio" name="q${questionCounter}-correct" class="mcq-radio">
                            <input type="text" class="custom-input" placeholder="Option D">
                        </div>
                    </div>
                </div>`;
            }

            questionBlock.innerHTML = questionHTML;

            // --- REMOVE BUTTON LOGIC ---
            const btnRemove = questionBlock.querySelector('.btn-remove');
            btnRemove.addEventListener('click', () => {
                questionBlock.remove();
                updateQuestionNumbers();
                if (questionsContainer.children.length === 0) {
                    emptyState.style.display = 'flex'; 
                    questionCounter = 0; 
                }
            });

            questionsContainer.appendChild(questionBlock);
            
            // Auto-scroll
            questionsContainer.scrollTo({
                top: questionsContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    // Helper to keep numbers/radio names in sync
    function updateQuestionNumbers() {
        const blocks = questionsContainer.querySelectorAll('.question-block');
        blocks.forEach((block, index) => {
            const newNum = index + 1;
            block.querySelector('.question-number').textContent = `Question ${newNum}`;
            
            // Only update radios if it's an MCQ quiz
            if (quizType === 'mcq') {
                const radios = block.querySelectorAll('.mcq-radio');
                radios.forEach(radio => {
                    radio.name = `q${newNum}-correct`;
                });
            }
        });
        questionCounter = blocks.length; 
    }

    // -------------------------------------------------------------
    // 4. CANCEL MODAL LOGIC
    // -------------------------------------------------------------
    const btnTriggerCancel = document.getElementById('btn-trigger-cancel');
    const cancelModalOverlay = document.getElementById('cancel-modal-overlay');
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    const btnCloseCancel = document.getElementById('btn-close-cancel');

    if (btnTriggerCancel && cancelModalOverlay) {
        btnTriggerCancel.addEventListener('click', () => cancelModalOverlay.style.display = 'flex');
        btnCloseCancel.addEventListener('click', () => cancelModalOverlay.style.display = 'none');
        btnConfirmCancel.addEventListener('click', () => window.location.href = '/dashboard'); 
    }

    // -------------------------------------------------------------
    // 5. SAVE QUIZ LOGIC 
    // -------------------------------------------------------------
    const btnSave = document.getElementById('btn-save-quiz');
    const saveModalOverlay = document.getElementById('save-modal-overlay');
    const btnConfirmSave = document.getElementById('btn-confirm-save');
    const btnCloseSave = document.getElementById('btn-close-save');

    if (btnSave && saveModalOverlay) {
        
        // 1. Open the modal when "Save Quiz" is clicked
        btnSave.addEventListener('click', () => {
            // Optional: You could add a check here to ensure they added at least 1 question before opening the modal!
            saveModalOverlay.style.display = 'flex';
        });

        // 2. Close the modal when "No" is clicked
        btnCloseSave.addEventListener('click', () => {
            saveModalOverlay.style.display = 'none';
        });

        // 3. Actually save the quiz when "Yes" is clicked
        btnConfirmSave.addEventListener('click', async () => {
            btnSave.textContent = "Saving...";
            btnSave.disabled = true;
            btnSave.style.opacity = '0.5';
            btnSave.style.cursor = 'not-allowed';
            saveModalOverlay.style.display = 'none';

            // Secure the inputs using the escapeHTML function we added earlier
            const titleInput = document.getElementById('quiz-title').value;
            const quizTitle = titleInput.trim() !== '' ? escapeHTML(titleInput).substring(0, 50) : 'Untitled Quiz';
            const descInput = document.getElementById('quiz-description').value;
            const quizDesc = escapeHTML(descInput.trim()); 

            const questions = [];
            const blocks = questionsContainer.querySelectorAll('.question-block');
            blocks.forEach((block) => {
                const inputs = block.querySelectorAll('.custom-input');
                if (inputs.length === 0) return;
                
                const qText = inputs[0].value.trim();
                if (quizType === 'id') {
                    questions.push({
                        text: qText,
                        type: 'id',
                        correctAnswer: inputs[1] ? inputs[1].value.trim() : ''
                    });
                } else {
                    const options = [inputs[1]?.value, inputs[2]?.value, inputs[3]?.value, inputs[4]?.value].filter(Boolean);
                    let correctIndex = 0;
                    block.querySelectorAll('.mcq-radio').forEach((r, idx) => { if(r.checked) correctIndex = idx; });
                    questions.push({
                        text: qText,
                        type: 'mcq',
                        options: options,
                        correctAnswer: options[correctIndex] || ''
                    });
                }
            });

            // --- MCQ VALIDATION: Ensure every question has a correct answer selected ---
            if (quizType === 'mcq') {
                for (let i = 0; i < blocks.length; i++) {
                    const block = blocks[i];
                    const radios = block.querySelectorAll('.mcq-radio');
                    const hasChecked = Array.from(radios).some(r => r.checked);
                    if (!hasChecked) {
                        alert(`Question ${i + 1}: Please select a correct answer.`);
                        btnSave.textContent = "Save Quiz";
                        btnSave.disabled = false;
                        btnSave.style.opacity = '1';
                        btnSave.style.cursor = 'pointer';
                        return;
                    }
                }
            }

            // --- NEW IMAGE CONVERSION LOGIC ---
            let thumbnailData = '';
            const fileInput = document.getElementById('thumbnail-upload');
            
            if (fileInput && fileInput.files.length > 0) {
                // Convert the file to a Base64 string
                const file = fileInput.files[0];

                // Client-side guard: reject files over 5MB
                if (file.size > 5 * 1024 * 1024) {
                    alert('Thumbnail image must be under 5MB. Please choose a smaller file.');
                    btnSave.textContent = "Save Quiz";
                    btnSave.disabled = false;
                    btnSave.style.opacity = '1';
                    btnSave.style.cursor = 'pointer';
                    return;
                }

                thumbnailData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }

            const quizPayload = {
                title: quizTitle,
                isPublic: userRole === 'admin' ? true : (document.getElementById('quiz-privacy') ? document.getElementById('quiz-privacy').value === 'public' : false),
                questions: questions,
                thumbnail: thumbnailData
            };
            

            try {
                const res = await fetchWithAuth('/api/quizzes/create', {
                    method: 'POST',
                    body: JSON.stringify(quizPayload)
                });
                const data = await res.json();
                
                if (res.ok) {
                    alert(`Quiz created successfully! Share code: ${data.shareCode}`);
                    window.location.href = userRole === 'admin' ? '/admin-dashboard' : '/dashboard';
                } else {
                    alert(`Failed to save quiz: ${data.message}`);
                    btnSave.textContent = "Save Quiz";
                    btnSave.disabled = false;
                    btnSave.style.opacity = '1';
                    btnSave.style.cursor = 'pointer';
                }
            } catch (err) {
                console.error(err);
                alert("An error occurred while communicating with the server.");
                btnSave.textContent = "Save Quiz";
                btnSave.disabled = false;
                btnSave.style.opacity = '1';
                btnSave.style.cursor = 'pointer';
            }
        });
        
    }
});