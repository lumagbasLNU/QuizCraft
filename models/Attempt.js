const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    quizTitle: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percent: { type: Number, required: true },
    smartReviewData: [{
        questionText: { type: String, required: true },
        userAnswer: { type: String, required: true },
        explanation: { type: String, required: true },
        searchQuery: { type: String, required: true },
        searchLink: { type: String, required: true }
    }],
    completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attempt', attemptSchema);
