const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    type: { type: String, enum: ['mcq', 'id'], required: true },
    text: { type: String, required: true },
    options: [{ type: String }], // Array of strings for MCQ
    correctAnswer: { type: String, required: true }
});

module.exports = mongoose.model('Question', questionSchema);
