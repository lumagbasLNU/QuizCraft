document.addEventListener('DOMContentLoaded', async () => {
    // 1. GET SHARE CODE FROM URL
    const urlParams = new URLSearchParams(window.location.search);
    const shareCode = urlParams.get('code');

    if (!shareCode) {
        alert("Invalid Quiz Link. No share code found.");
        window.location.href = '/dashboard';
        return;
    }

    // STATE VARIABLES
    let quizData = null;
    let questionsData = [];
    let currentIndex = 0;
    let userAnswers = []; // Array of objects { questionId, answer }

    // DOM ELEMENTS
    const loadingUi = document.getElementById('loading-ui');
    const loadingText = document.getElementById('loading-text');
    const quizUi = document.getElementById('quiz-ui');
    const resultsUi = document.getElementById('results-ui');
    
    const qtTitle = document.getElementById('qt-title');
    const qtQuestionText = document.getElementById('qt-question-text');
    const qtSubtext = document.getElementById('qt-subtext');
    const qtDynamicInputArea = document.getElementById('qt-dynamic-input-area');
    
    const progressFill = document.getElementById('qt-progress-fill');
    const progressText = document.getElementById('qt-progress-text');
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnExit = document.getElementById('btn-exit');

    // MODAL ELEMENTS
    const exitModalOverlay = document.getElementById('exit-modal-overlay');
    const btnConfirmExit = document.getElementById('btn-confirm-exit');
    const btnCloseExit = document.getElementById('btn-close-exit');

    // 2. FETCH QUIZ FROM API
    try {
        // Using the fetchWithAuth interceptor we built in api.js
        const res = await fetchWithAuth(`/api/quizzes/${shareCode}`);
        if (!res.ok) throw new Error("Quiz not found or unauthorized");
        
        const data = await res.json();
        quizData = data.quiz;
        questionsData = data.questions;

        // Initialize user answers array with null/empty values based on question type
        userAnswers = questionsData.map(q => ({
            questionId: q._id,
            answer: q.type === 'id' ? "" : null
        }));

        qtTitle.textContent = quizData.title;

        // Display creator name
        const qtCreator = document.getElementById('qt-creator');
        if (qtCreator) {
            qtCreator.textContent = quizData.creatorId?.username || 'Unknown';
        }

        // Hide loading screen, show quiz UI
        loadingUi.style.display = 'none';
        quizUi.style.display = 'block';
        
        renderQuestion(currentIndex);

    } catch (error) {
        console.error(error);
        alert("Failed to load quiz. It may not exist or you don't have access.");
        window.location.href = '/dashboard';
    }

    // 3. RENDER FUNCTION
    function renderQuestion(index) {
        const q = questionsData[index];
        const isLastQuestion = index === questionsData.length - 1;

        qtQuestionText.textContent = q.text;
        qtSubtext.textContent = q.type === 'id' ? "Type your answer below:" : "Select the best option:";
        
        const currentNum = index + 1;
        progressText.textContent = `${currentNum} / ${questionsData.length}`;
        progressFill.style.width = `${(currentNum / questionsData.length) * 100}%`;

        btnPrev.style.display = index === 0 ? 'none' : 'inline-flex';
        btnNext.textContent = isLastQuestion ? "Submit Quiz" : "Next";

        qtDynamicInputArea.innerHTML = '';

        if (q.type === 'id') {
            const inputHtml = `
                <div class="qt-input-container">
                    <input type="text" class="qt-id-input" id="qt-answer-input" placeholder="Your answer..." autocomplete="off">
                </div>
            `;
            qtDynamicInputArea.innerHTML = inputHtml;
            const inputEl = document.getElementById('qt-answer-input');
            
            // Restore answer if exists
            const savedAns = userAnswers.find(a => a.questionId === q._id);
            if (savedAns) inputEl.value = savedAns.answer;

            inputEl.focus();

            inputEl.addEventListener('input', (e) => {
                const ansObj = userAnswers.find(a => a.questionId === q._id);
                if (ansObj) ansObj.answer = e.target.value;
            });

            inputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    btnNext.click();
                }
            });

        } else { // MCQ
            const optionsList = document.createElement('div');
            optionsList.className = 'qt-options-list';

            q.options.forEach(optionText => {
                const optDiv = document.createElement('div');
                optDiv.className = 'qt-option';
                
                const savedAns = userAnswers.find(a => a.questionId === q._id);
                if (savedAns && savedAns.answer === optionText) {
                    optDiv.classList.add('selected');
                }

                const safeText = optionText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                optDiv.innerHTML = `
                    <div class="qt-radio"><div class="qt-radio-fill"></div></div>
                    <span>${safeText}</span>
                `;

                optDiv.addEventListener('click', () => {
                    optionsList.querySelectorAll('.qt-option').forEach(el => el.classList.remove('selected'));
                    optDiv.classList.add('selected');
                    const ansObj = userAnswers.find(a => a.questionId === q._id);
                    if (ansObj) ansObj.answer = optionText;
                });

                optionsList.appendChild(optDiv);
            });
            qtDynamicInputArea.appendChild(optionsList);
        }
    }

    // 4. NAVIGATION
    btnNext.addEventListener('click', () => {
        const currentAns = userAnswers[currentIndex].answer;
        const qType = questionsData[currentIndex].type;
        
        if ((qType === 'id' && currentAns.trim() === "") || (qType === 'mcq' && currentAns === null)) {
            alert("Please answer the question before proceeding.");
            return;
        }

        if (currentIndex < questionsData.length - 1) {
            currentIndex++;
            renderQuestion(currentIndex);
        } else {
            submitQuiz();
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion(currentIndex);
        }
    });

    btnExit.addEventListener('click', () => {
        exitModalOverlay.style.display = 'flex';
    });
    btnCloseExit.addEventListener('click', () => {
        exitModalOverlay.style.display = 'none';
    });
    btnConfirmExit.addEventListener('click', () => {
        window.location.href = '/dashboard';
    });

    // 5. SUBMIT TO SMART ENGINE
    async function submitQuiz() {
        quizUi.style.display = 'none';
        loadingUi.style.display = 'flex';
        loadingText.textContent = "Grading your quiz... Please wait.";

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        try {
            const res = await fetchWithAuth(`/api/quizzes/${shareCode}/submit`, {
                method: 'POST',
                body: JSON.stringify({ answers: userAnswers }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error("Submission failed");

            const resultData = await res.json();
            
            // Display the smart review results
            loadingUi.style.display = 'none';
            resultsUi.style.display = 'block';

            // Render Final Score
            document.getElementById('score-text').textContent = `You scored ${resultData.score} out of ${resultData.totalQuestions}`;

            // Add "View Detailed Results" button linking to the detailed results page
            const btnRow = document.getElementById('results-btn-row');
            if (resultData.attemptId && btnRow) {
                const detailBtn = document.createElement('a');
                detailBtn.href = `/quiz_result?id=${resultData.attemptId}`;
                detailBtn.className = 'btn-primary';
                detailBtn.style.cssText = 'min-width: 220px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none;';
                detailBtn.textContent = 'View Detailed Results';
                btnRow.appendChild(detailBtn);
            }

            const reviewContainer = document.getElementById('smart-review-cards');
            reviewContainer.innerHTML = '';

            if (resultData.smartReviewData.length === 0 && resultData.score === resultData.totalQuestions) {
                reviewContainer.innerHTML = '<p style="color: #4CAF50; text-align: center; font-size: 1.2rem; font-weight: bold;">Perfect score! No AI review needed.</p>';
                return;
            } else if (resultData.smartReviewData.length === 0) {
                reviewContainer.innerHTML = '<p style="color: var(--text-muted, #aaa); text-align: center; font-size: 1.05rem; margin-top: 10px;">Smart Review is disabled. Enable it in <strong style="color: #00FFF6;">Settings</strong> for AI-powered explanations.</p>';
                return;
            }

            // Render Gemini Explanations
            resultData.smartReviewData.forEach(item => {
                const card = document.createElement('div');
                card.className = 'smart-review-card';
                card.innerHTML = `
                    <p style="font-weight: 600; font-size: 1.1rem; margin-bottom: 10px; color: white;">Q: ${item.questionText}</p>
                    <p style="color: #aaa;">Your Answer: <span class="wrong-answer-text">${item.userAnswer}</span></p>
                    <div class="ai-explanation">
                        <strong style="color: #00FFF6;">AI Instructor:</strong> ${item.explanation}
                    </div>
                    <a href="${item.searchLink}" target="_blank" class="search-btn">Learn More on Google</a>
                `;
                reviewContainer.appendChild(card);
            });

        } catch (error) {
            clearTimeout(timeoutId);
            console.error(error);
            if (error.name === 'AbortError') {
                alert("The AI Grading Engine took too long to respond. Please check your connection and try submitting again.");
            } else {
                alert("Error submitting quiz to AI Engine. Please try again.");
            }
            loadingUi.style.display = 'none';
            quizUi.style.display = 'block';
        }
    }
});