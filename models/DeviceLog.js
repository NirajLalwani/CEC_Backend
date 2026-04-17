const mongoose = require('mongoose');

const deviceLogSchema = new mongoose.Schema({
    deviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true
    },
    status: {
        type: String,
        enum: ['ON', 'OFF'],
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DeviceLog', deviceLogSchema);