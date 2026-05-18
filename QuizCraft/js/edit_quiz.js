document.addEventListener('DOMContentLoaded', async () => {
    
    // Helper function to prevent Cross-Site Scripting (XSS)
    function escapeHTML(str) {
        if (!str) return "";
        return String(str).replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    // Detect user role from JWT for role-based redirects
    let userRole = 'user';
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.role || 'user';
        }
    } catch (err) { /* ignore decode errors */ }

    const homePath = userRole === 'admin' ? '/admin-dashboard' : '/dashboard';

    // -------------------------------------------------------------
    // 1. GET SHARE CODE & FETCH DATA
    // -------------------------------------------------------------
    const urlParams = new URLSearchParams(window.location.search);
    const shareCode = urlParams.get('code');

    if (!shareCode) {
        alert("Invalid Quiz Link. No share code found.");
        window.location.href = homePath;
        return;
    }

    let quizData = null;
    let questionsData = [];

    try {
        const res = await fetchWithAuth(`/api/quizzes/${shareCode}/edit`);
        if (!res.ok) throw new Error("Quiz not found or unauthorized");
        
        const data = await res.json();
        quizData = data.quiz;
        questionsData = data.questions;
    } catch (error) {
        console.error(error);
        alert("Failed to load quiz. It may not exist or you don't have access.");
        window.location.href = homePath;
        return;
    }

    // Set quizType based on data
    let quizType = questionsData.length > 0 && questionsData[0].type === 'id' ? 'id' : 'mcq';

    // PRE-FILL TOP CONFIG SECTION
    document.getElementById('display-quiz-title').textContent = quizData.title;
    document.getElementById('quiz-title').value = quizData.title;
    const privacySelect = document.getElementById('quiz-privacy');
    if (privacySelect) {
        privacySelect.value = quizData.isPublic ? "public" : "private";
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
    // 3. DYNAMIC QUESTION CREATION & PRE-FILLING
    // -------------------------------------------------------------
    const btnAddQuestion = document.getElementById('add-question-btn');
    const questionsContainer = document.getElementById('questions-container');
    const emptyState = document.getElementById('empty-state');
    let questionCounter = 0;

    // A unified function to generate a question block. 
    function generateQuestionBlock(qData = null) {
        questionCounter++;
        if (emptyState) emptyState.style.display = 'none';

        const questionBlock = document.createElement('div');
        questionBlock.className = 'question-block glass-panel mt-2';

        const prefilledText = qData ? escapeHTML(qData.text) : "";

        let questionHTML = `
            <div class="question-header">
                <h3 class="question-number">Question ${questionCounter}</h3>
                <button type="button" class="btn-remove">Remove</button>
            </div>
            <div class="form-group mt-2">
                <label>Question Text</label>
                <input type="text" class="custom-input" value="${prefilledText}" placeholder="Enter your question...">
            </div>
        `;

        if (quizType === 'id') {
            // IDENTIFICATION SPECIFIC INPUT
            // In safe payload, correct answer is not provided if we use the same endpoint as taking a quiz.
            // Wait, we need an endpoint that DOES return answers! The existing GET /api/quizzes/:shareCode strips answers.
            // I'll need to update server.js to not strip answers if user is creator, or add a new endpoint.
            // For now, assume we will update server.js or it returns undefined. Wait! I WILL UPDATE server.js.
            const prefilledAnswer = (qData && qData.correctAnswer) ? escapeHTML(qData.correctAnswer) : "";
            questionHTML += `
            <div class="form-group mt-2">
                <label>Correct Answer</label>
                <input type="text" class="custom-input" value="${prefilledAnswer}" placeholder="Enter the exact correct answer...">
            </div>`;
        } else {
            // MULTIPLE CHOICE SPECIFIC INPUTS
            let optionsHTML = '';
            for (let i = 0; i < 4; i++) {
                const optText = (qData && qData.options) ? escapeHTML(qData.options[i]) : "";
                const isChecked = (qData && qData.correctAnswer === qData.options[i]) ? 'checked' : '';
                
                // Dynamically sets placeholders A, B, C, D
                const placeholderLetter = String.fromCharCode(65 + i); 

                optionsHTML += `
                    <div class="mcq-option">
                        <input type="radio" name="q${questionCounter}-correct" class="mcq-radio" ${isChecked}>
                        <input type="text" class="custom-input" value="${optText}" placeholder="Option ${placeholderLetter}">
                    </div>
                `;
            }

            questionHTML += `
            <div class="form-group mt-2">
                <label>Answer Options <span class="label-subtext">(Click the circle of the correct answer)</span></label>
                <div class="mcq-grid mt-1">
                    ${optionsHTML}
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
    }

    // Helper to keep numbers/radio names in sync when deleting
    function updateQuestionNumbers() {
        const blocks = questionsContainer.querySelectorAll('.question-block');
        blocks.forEach((block, index) => {
            const newNum = index + 1;
            block.querySelector('.question-number').textContent = `Question ${newNum}`;
            
            if (quizType === 'mcq') {
                const radios = block.querySelectorAll('.mcq-radio');
                radios.forEach(radio => {
                    radio.name = `q${newNum}-correct`;
                });
            }
        });
        questionCounter = blocks.length; 
    }

    // -> 1. Pre-fill existing questions on load
    questionsData.forEach(q => generateQuestionBlock(q));

    // -> 2. Bind the "Add Question" button to create blank blocks
    if (btnAddQuestion) {
        btnAddQuestion.addEventListener('click', () => {
            generateQuestionBlock(null);
            
            // Auto-scroll to the newly added block
            questionsContainer.scrollTo({
                top: questionsContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
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
        btnConfirmCancel.addEventListener('click', () => window.location.href = homePath); 
    }

    // -------------------------------------------------------------
    // 5. SAVE QUIZ LOGIC 
    // -------------------------------------------------------------
    const btnSave = document.getElementById('btn-save-quiz');
    const saveModalOverlay = document.getElementById('save-modal-overlay');
    const btnConfirmSave = document.getElementById('btn-confirm-save');
    const btnCloseSave = document.getElementById('btn-close-save');

    if (btnSave && saveModalOverlay) {
        
        btnSave.addEventListener('click', () => {
            saveModalOverlay.style.display = 'flex';
        });

        btnCloseSave.addEventListener('click', () => {
            saveModalOverlay.style.display = 'none';
        });

        btnConfirmSave.addEventListener('click', async () => {
            saveModalOverlay.style.display = 'none';
            btnSave.textContent = "Saving...";
            btnSave.disabled = true;

            const titleInput = document.getElementById('quiz-title').value;
            const quizTitle = titleInput.trim() !== '' ? escapeHTML(titleInput) : 'Untitled Quiz';
            const isPublic = document.getElementById('quiz-privacy') ? document.getElementById('quiz-privacy').value === 'public' : quizData.isPublic;

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
                        return;
                    }
                }
            }

            // --- THUMBNAIL CONVERSION LOGIC ---
            let thumbnailData = '';
            const thumbInput = document.getElementById('thumbnail-upload');

            if (thumbInput && thumbInput.files.length > 0) {
                const file = thumbInput.files[0];

                // Client-side guard: reject files over 5MB
                if (file.size > 5 * 1024 * 1024) {
                    alert('Thumbnail image must be under 5MB. Please choose a smaller file.');
                    btnSave.textContent = "Save Quiz";
                    btnSave.disabled = false;
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
                isPublic: isPublic,
                questions: questions,
                thumbnail: thumbnailData
            };

            try {
                const res = await fetchWithAuth(`/api/quizzes/${shareCode}`, {
                    method: 'PUT',
                    body: JSON.stringify(quizPayload)
                });
                const data = await res.json();
                
                if (res.ok) {
                    alert('Quiz updated successfully!');
                    window.location.href = homePath;
                } else {
                    alert(`Failed to save quiz: ${data.message}`);
                    btnSave.textContent = "Save Quiz";
                    btnSave.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert("An error occurred while communicating with the server.");
                btnSave.textContent = "Save Quiz";
                btnSave.disabled = false;
            }
        });
    }
});