const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    bounty: Number,
    status: {
        type: String,
        enum: ['Open', 'Claimed', 'Completed'],
        default: 'Open'
    },
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    tasker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Task', taskSchema);