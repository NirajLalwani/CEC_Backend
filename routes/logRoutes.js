const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const DeviceLog = require('../models/DeviceLog');
const Device = require('../models/Device');

// Add log for device
router.post('/', [
    body('deviceCode').notEmpty().withMessage('Device code is required'),
    body('status').isIn(['ON', 'OFF']).withMessage('Status must be ON or OFF')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { deviceCode, status } = req.body;

        // Find device by deviceCode
        const device = await Device.findOne({ deviceCode });
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        const log = new DeviceLog({
            deviceId: device._id,
            status
        });

        await log.save();
        res.json(log);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get all logs for a device (authenticated)
router.get('/:deviceId', auth, async (req, res) => {
    try {
        // Verify device belongs to user
        const device = await Device.findOne({ _id: req.params.deviceId, userId: req.user.id });
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        const logs = await DeviceLog.find({ deviceId: req.params.deviceId }).sort({ createdAt: -1 });

        // Calculate statistics
        const onCount = logs.filter(log => log.status === 'ON').length;
        const offCount = logs.filter(log => log.status === 'OFF').length;
        const totalLogs = logs.length;
        const uptimePercentage = totalLogs > 0 ? (onCount / totalLogs) * 100 : 0;

        res.json({
            logs,
            stats: {
                onCount,
                offCount,
                totalLogs,
                uptimePercentage: uptimePercentage.toFixed(2)
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;