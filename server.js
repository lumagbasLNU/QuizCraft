require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // NEW: Added the JWT package
const cors = require('cors');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');
const Attempt = require('./models/Attempt');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- AUTO-SEED ADMIN ACCOUNT ---
async function seedAdmin() {
    const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    // Guard: If any credential is missing, skip seeding gracefully
    if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.warn("⚠️  Admin seed skipped: ADMIN_USERNAME, ADMIN_EMAIL, or ADMIN_PASSWORD not set in .env");
        return;
    }

    try {
        // Check if an account with this email or username already exists
        const existingAdmin = await User.findOne({
            $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }]
        });

        if (existingAdmin) {
            console.log("ℹ️  Admin account already exists. Skipping seed.");
            return;
        }

        // Hash the password using the exact same flow as /api/register
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

        const adminUser = new User({
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            password_hash: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log(`✅ Default admin account seeded successfully. Username: ${ADMIN_USERNAME}`);
    } catch (error) {
        console.error("❌ Error seeding admin account:", error.message);
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to understand JSON data from the frontend
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Successfully connected to the MongoDB database!");
        await seedAdmin();
    })
    .catch((error) => console.log("Error connecting to database:", error));

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
};

// --- PRODUCTION ERROR HANDLER ---
function sendError(res, error, context = 'Server error') {
    console.error(`[${context}]`, error);
    if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ message: 'An internal server error occurred.' });
    }
    return res.status(500).json({ message: `${context}: ${error.message}` });
}

// --- ROUTES ---

// 1. Basic Test Route
app.get('/api/status', (req, res) => {
    res.json({ message: "QuizCraft API is running" });
});

// Health Check (for Render / uptime monitors)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. User Registration Route
app.post('/api/register', async (req, res) => {
    try {
        // --- DEBUGGING LOGS ---
        console.log("--- New Registration Request ---");
        console.log("Headers:", req.headers['content-type']);
        console.log("Body Content:", req.body);

        // --- GUARD CLAUSE ---
        // If req.body is missing or empty, stop here and send an error instead of crashing
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                message: "Server received an empty request. Check your Thunder Client JSON format."
            });
        }

        const { username, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ username: username }, { email: email }]
        });

        if (existingUser) {
            return res.status(400).json({ message: "Username or email already taken" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create and save new user
        const newUser = new User({
            username: username,
            email: email,
            password_hash: hashedPassword,
            role: role === 'admin' ? 'admin' : 'user'
        });

        await newUser.save();

        console.log(`User ${username} successfully registered!`);
        res.status(201).json({ message: "User registered successfully!" });

    } catch (error) {
        sendError(res, error, 'Registration error');
    }
});

// 3. User Login Route (NEW)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Step A: Find the user
        const user = await User.findOne({ username: username });
        if (!user) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        // Step B: Check the password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        // Step C: Generate the Token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET, // Pulls the secret from your .env file
            { expiresIn: '1h' }
        );

        res.json({ message: "Login successful!", token: token });

    } catch (error) {
        sendError(res, error, 'Login error');
    }
});

// 4. Get Current User Route
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password_hash');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        sendError(res, error, 'User fetch error');
    }
});

// 4b. Update User Settings
app.put('/api/user/settings', authenticateToken, async (req, res) => {
    try {
        const { smartReview } = req.body;

        // Whitelist only the fields users are allowed to change
        const updateFields = {};
        if (typeof smartReview === 'boolean') {
            updateFields.smartReview = smartReview;
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ message: 'No valid fields to update.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-password_hash');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'Settings updated successfully.', user: updatedUser });
    } catch (error) {
        sendError(res, error, 'Settings update error');
    }
});

// --- PHASE 3: QUIZ MANAGEMENT ---

// 5. Get Community Quizzes
app.get('/api/quizzes/community', authenticateToken, async (req, res) => {
    try {
        // Force the browser to fetch fresh data every time
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        
        const quizzes = await Quiz.find({ isCommunity: true })
            .populate('creatorId', 'username role')
            .sort({ createdAt: -1 })
            .select('title shareCode creatorId thumbnail isPublic');

        // Defense-in-depth: only return quizzes where the creator is actually an admin
        const adminQuizzes = quizzes.filter(q => q.creatorId?.role === 'admin');
            
        // Attach question counts
        const withCounts = await Promise.all(adminQuizzes.map(async (q) => {
            const count = await Question.countDocuments({ quizId: q._id });
            return { ...q.toObject(), questionCount: count };
        }));

        res.json(withCounts);
    } catch (error) {
        sendError(res, error, 'Community quizzes error');
    }
});

// 6. Get My Quizzes (paginated)
app.get('/api/quizzes/my-quizzes', authenticateToken, async (req, res) => {
    try {
        // Force the browser to fetch fresh data every time
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 8));
        const skip = (page - 1) * limit;

        const totalQuizzes = await Quiz.countDocuments({ creatorId: req.user.userId });
        const totalPages = Math.ceil(totalQuizzes / limit) || 1;

        const quizzes = await Quiz.find({ creatorId: req.user.userId })
            .populate('creatorId', 'username')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Attach question counts
        const withCounts = await Promise.all(quizzes.map(async (q) => {
            const count = await Question.countDocuments({ quizId: q._id });
            return { ...q.toObject(), questionCount: count };
        }));

        res.json({ quizzes: withCounts, currentPage: page, totalPages, totalQuizzes });
    } catch (error) {
        sendError(res, error, 'My quizzes error');
    }
});

// 7a. Fetch quiz WITH answers (creator only — for the edit page)
app.get('/api/quizzes/:shareCode/edit', authenticateToken, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ shareCode: req.params.shareCode });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Security: Only the creator or an admin can fetch answers
        if (quiz.creatorId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized. Only the quiz creator or an admin can access this.' });
        }

        const questions = await Question.find({ quizId: quiz._id });
        res.json({ quiz, questions }); // Includes correctAnswer
    } catch (error) {
        sendError(res, error, 'Quiz edit fetch error');
    }
});

// 7b. The Quiz Fetcher (Strips answers — for quiz takers)
app.get('/api/quizzes/:shareCode', authenticateToken, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ shareCode: req.params.shareCode })
            .populate('creatorId', 'username');
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // PRIVACY GATE: Block access to private quizzes for non-owners
        // A quiz is accessible if: it's a community quiz, OR it's explicitly public, OR user is the creator/admin
        if (quiz.isPublic !== true && !quiz.isCommunity) {
            const isCreator = quiz.creatorId._id.toString() === req.user.userId;
            const isAdmin = req.user.role === 'admin';
            if (!isCreator && !isAdmin) {
                return res.status(403).json({ message: 'This quiz is private.' });
            }
        }

        const questions = await Question.find({ quizId: quiz._id });

        // CRITICAL SECURITY: Strip correct answers before sending
        const safeQuestions = questions.map(q => {
            return {
                _id: q._id,
                type: q.type,
                text: q.text,
                options: q.options
            };
        });

        res.json({ quiz, questions: safeQuestions });
    } catch (error) {
        sendError(res, error, 'Quiz fetch error');
    }
});

// 7.5. Delete Quiz Route
app.delete('/api/quizzes/:shareCode', authenticateToken, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ shareCode: req.params.shareCode });

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Ensure the logged-in user is the creator or an admin
        if (quiz.creatorId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. You do not have permission to delete this quiz.' });
        }

        // Delete the questions associated with the quiz
        await Question.deleteMany({ quizId: quiz._id });

        // Delete the quiz itself
        await Quiz.deleteOne({ _id: quiz._id });

        res.json({ message: 'Quiz and associated questions deleted successfully' });
    } catch (error) {
        sendError(res, error, 'Quiz delete error');
    }
});

// 7.7 Update an Existing Quiz
app.put('/api/quizzes/:shareCode', authenticateToken, async (req, res) => {
    try {
        const { title, isPublic, questions, thumbnail } = req.body;
        const quiz = await Quiz.findOne({ shareCode: req.params.shareCode });

        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Security check: Only the creator or an admin can edit
        if (quiz.creatorId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized to edit this quiz' });
        }

        // 1. Update the main quiz details
        quiz.title = title;
        // Role-based enforcement: only admins get community visibility
        quiz.isCommunity = (req.user.role === 'admin');
        quiz.isPublic = (req.user.role === 'admin') ? true : (isPublic === true);

        // Save the new thumbnail if the user uploaded one
        if (thumbnail) quiz.thumbnail = thumbnail;

        await quiz.save();

        // 2. Fast Batch Update: Wipe old questions, insert the new ones
        await Question.deleteMany({ quizId: quiz._id });

        const questionsToInsert = questions.map((q) => ({
            quizId: quiz._id,
            type: q.type,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer
        }));

        await Question.insertMany(questionsToInsert);

        res.json({ message: 'Quiz updated successfully' });

    } catch (error) {
        sendError(res, error, 'Quiz update error');
    }
});


// 8. The Smart-Review Engine (Submit Quiz)
app.post('/api/quizzes/:shareCode/submit', authenticateToken, async (req, res) => {
    try {
        const { answers } = req.body; // Expecting array of { questionId, answer }
        const quiz = await Quiz.findOne({ shareCode: req.params.shareCode });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // PRIVACY GATE: Block submission to private quizzes for non-owners
        if (quiz.isPublic !== true && !quiz.isCommunity) {
            const isCreator = quiz.creatorId.toString() === req.user.userId;
            const isAdmin = req.user.role === 'admin';
            if (!isCreator && !isAdmin) {
                return res.status(403).json({ message: 'This quiz is private.' });
            }
        }

        // Check user's Smart Review preference
        const currentUser = await User.findById(req.user.userId);
        const isSmartReviewEnabled = currentUser ? currentUser.smartReview !== false : true;

        const questions = await Question.find({ quizId: quiz._id });
        let score = 0;
        const wrongAnswers = [];

        // Grade the quiz (null-safe)
        questions.forEach(q => {
            const userAns = answers.find(a => a.questionId === q._id.toString());
            const userAnswer = userAns?.answer || '';
            const correctAnswer = q.correctAnswer || '';

            if (userAnswer && correctAnswer && userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
                score++;
            } else if (userAns) {
                wrongAnswers.push({
                    questionText: q.text || 'Unknown question',
                    userAnswer: userAnswer || '(no answer)',
                    correctAnswer: correctAnswer || '(no answer set)'
                });
            }
        });

        // Call Gemini ONLY if user has Smart Review enabled
        let smartReviewData = [];
        if (isSmartReviewEnabled && wrongAnswers.length > 0) {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            // Validate all wrong answers first
            const validWrongAnswers = wrongAnswers.filter(wa => 
                wa.questionText && wa.userAnswer !== null && wa.userAnswer !== undefined && wa.correctAnswer
            );

            // Skip invalid ones
            wrongAnswers.filter(wa => 
                !wa.questionText || wa.userAnswer === null || wa.userAnswer === undefined || !wa.correctAnswer
            ).forEach(wa => {
                smartReviewData.push({
                    questionText: wa.questionText || 'Unknown',
                    userAnswer: wa.userAnswer || '(no answer)',
                    explanation: "Explanation unavailable: incomplete question data.",
                    searchQuery: wa.correctAnswer || 'study guide',
                    searchLink: `https://www.google.com/search?q=${encodeURIComponent(wa.correctAnswer || 'study guide')}`
                });
            });

            if (validWrongAnswers.length > 0) {
                try {
                    // Build a single batched prompt for ALL wrong answers
                    const questionsBlock = validWrongAnswers.map((wa, i) => 
                        `Q${i + 1}: "${wa.questionText}" | User answered: "${wa.userAnswer}" | Correct: "${wa.correctAnswer}"`
                    ).join('\n');

                    const batchPrompt = `As an IT instructor, review these incorrect answers. For EACH question, provide:
1. A concise 2-sentence explanation of why the user's answer is wrong and the correct answer is right.
2. A short Google search query to learn more.

Respond in valid JSON array format ONLY, no markdown. Each element: {"index": <number starting at 1>, "explanation": "<text>", "searchQuery": "<query>"}

${questionsBlock}`;

                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Gemini API timeout (30s)')), 30000)
                    );

                    const result = await Promise.race([
                        model.generateContent(batchPrompt),
                        timeoutPromise
                    ]);

                    const text = result.response.text();
                    if (!text || text.trim().length === 0) {
                        throw new Error('Empty response from Gemini');
                    }

                    // Parse the JSON response — strip markdown fences if present
                    const cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                    const parsed = JSON.parse(cleanText);

                    // Map parsed results back to wrong answers
                    validWrongAnswers.forEach((wa, i) => {
                        const aiResult = parsed[i] || {};
                        smartReviewData.push({
                            questionText: wa.questionText,
                            userAnswer: wa.userAnswer,
                            explanation: aiResult.explanation || 'Explanation unavailable.',
                            searchQuery: aiResult.searchQuery || wa.correctAnswer,
                            searchLink: `https://www.google.com/search?q=${encodeURIComponent(aiResult.searchQuery || wa.correctAnswer)}`
                        });
                    });

                    console.log(`[Smart Review] Batched ${validWrongAnswers.length} questions in 1 API call — success`);

                } catch (err) {
                    console.error('[Smart Review] Batched Gemini call failed:', {
                        errorName: err.name || 'Unknown',
                        errorMessage: err.message?.substring(0, 200) || 'No message',
                        isTimeout: err.message?.includes('timeout'),
                        isRateLimit: err.status === 429 || err.message?.includes('429'),
                    });

                    // Fallback: provide search links without AI explanations
                    validWrongAnswers.forEach(wa => {
                        smartReviewData.push({
                            questionText: wa.questionText,
                            userAnswer: wa.userAnswer,
                            explanation: "Explanation unavailable due to AI service error.",
                            searchQuery: wa.correctAnswer,
                            searchLink: `https://www.google.com/search?q=${encodeURIComponent(wa.correctAnswer)}`
                        });
                    });
                }
            }
        }

        // Save the Attempt
        const attempt = new Attempt({
            userId: req.user.userId,
            quizId: quiz._id,
            quizTitle: quiz.title,
            score,
            totalQuestions: questions.length,
            percent: Math.round((score / questions.length) * 100),
            smartReviewData
        });
        await attempt.save();

        res.json({ score, totalQuestions: questions.length, smartReviewData, smartReviewEnabled: isSmartReviewEnabled, attemptId: attempt._id });

    } catch (error) {
        sendError(res, error, 'Quiz submit error');
    }
});

// 9. Create a New Quiz
app.post('/api/quizzes/create', authenticateToken, async (req, res) => {
    try {
        const { title, isPublic, questions, thumbnail } = req.body;

        // Generate a random 6-character shareCode (e.g., "A7X9TQ")
        const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Role-based enforcement: only admins get community visibility
        const isCommunity = (req.user.role === 'admin');
        const quizIsPublic = (req.user.role === 'admin') ? true : (isPublic === true);

        const newQuiz = new Quiz({
            title,
            creatorId: req.user.userId,
            isCommunity,
            isPublic: quizIsPublic,
            shareCode,
            thumbnail: thumbnail || '../assets/background.svg'
        });

        const savedQuiz = await newQuiz.save();

        // THE FIX: Map the questions into a flat array, then use insertMany() 
        // to save them all to the database in a single, fast network request.
        const questionsToInsert = questions.map((q) => ({
            quizId: savedQuiz._id,
            type: q.type,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer
        }));

        await Question.insertMany(questionsToInsert);

        res.status(201).json({
            message: 'Quiz created successfully!',
            shareCode: savedQuiz.shareCode
        });

    } catch (error) {
        sendError(res, error, 'Quiz create error');
    }
});

// 9.5. Fetch Quiz Attempts (Owner Only)
app.get('/api/quizzes/:shareCode/attempts', authenticateToken, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ shareCode: req.params.shareCode });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Security: Only the quiz creator or an admin can view attempts
        if (quiz.creatorId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only the quiz owner can view attempts.' });
        }

        const attempts = await Attempt.find({ quizId: quiz._id })
            .populate('userId', 'username')
            .sort({ completedAt: -1 });

        // Map to a clean response shape
        const result = attempts.map(a => ({
            takerName: a.userId?.username || 'Deleted User',
            quizTitle: a.quizTitle,
            score: a.score,
            totalQuestions: a.totalQuestions,
            percent: a.percent,
            completedAt: a.completedAt
        }));

        res.json(result);
    } catch (error) {
        sendError(res, error, 'Quiz attempts fetch error');
    }
});

// 10. Fetch User History
app.get('/api/user/history', authenticateToken, async (req, res) => {
    try {
        const attempts = await Attempt.find({ userId: req.user.userId })
            .sort({ completedAt: -1 }); // Newest first
        res.json(attempts);
    } catch (error) {
        sendError(res, error, 'History fetch error');
    }
});

// 11. Admin Global Stats
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [totalUsers, totalQuizzes, totalAttempts] = await Promise.all([
            User.countDocuments(),
            Quiz.countDocuments(),
            Attempt.countDocuments()
        ]);
        res.json({ totalUsers, totalQuizzes, totalAttempts });
    } catch (error) {
        sendError(res, error, 'Admin stats error');
    }
});

// 12. Admin: Get All Quizzes
app.get('/api/admin/quizzes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const quizzes = await Quiz.find({})
            .populate('creatorId', 'username')
            .sort({ createdAt: -1 })
            .select('title shareCode creatorId isCommunity isPublic thumbnail createdAt');
        res.json(quizzes);
    } catch (error) {
        sendError(res, error, 'Admin quizzes error');
    }
});

// Tell Express where to find your CSS, Images, and JS files
app.use(express.static(path.join(__dirname, 'QuizCraft')));

// Root route — redirect to login page
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Map the /register URL to the register.html file
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'register.html'));
});

// Map the /login URL to the login.html file
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'login.html'));
});

// Map the User Dashboard
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'dashboard.html'));
});

// Map the Admin Dashboard
app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'admin-dashboard.html'));
});

// (Optional but helpful) Clean URLs without the .html
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'dashboard.html'));
});
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'admin-dashboard.html'));
});

// Create Quiz
app.get('/create_quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'create_quiz.html'));
});

// Edit Quiz
app.get('/edit_quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'edit_quiz.html'));
});

// Take Quiz
app.get('/take_quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'take_quiz.html'));
});

// Quiz History
app.get('/quiz_history', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'quiz_history.html'));
});

// Quiz Results
app.get('/quiz_result', (req, res) => {
    res.sendFile(path.join(__dirname, 'QuizCraft', 'templates', 'quiz_result.html'));
});

// Manage Quizzes (Admin) — Redirects to consolidated dashboard
app.get('/manage-quizzes', (req, res) => {
    res.redirect('/admin-dashboard');
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
