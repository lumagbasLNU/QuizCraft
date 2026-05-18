const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    shareCode: { type: String, unique: true, required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isCommunity: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: true },
    thumbnail: { type: String, default: '../assets/background.svg', maxlength: [15000000, 'Thumbnail image is too large. Please use a smaller image.'] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);
