const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Device = require('../models/Device');
const DeviceLog = require('../models/DeviceLog');

// Get all devices for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const devices = await Device.find({ userId: req.user.id }).sort({ createdAt: -1 });

        // Calculate uptime for each device
        const devicesWithUptime = await Promise.all(devices.map(async (device) => {
            const logs = await DeviceLog.find({ deviceId: device._id });
            const onCount = logs.filter(log => log.status === 'ON').length;
            const totalLogs = logs.length;
            const uptimePercentage = totalLogs > 0 ? (onCount / totalLogs) * 100 : 0;

            return {
                ...device.toObject(),
                uptime: uptimePercentage.toFixed(2)
            };
        }));

        res.json(devicesWithUptime);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get device by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const device = await Device.findOne({ _id: req.params.id, userId: req.user.id });
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }
        res.json(device);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Add new device
router.post('/', [
    auth,
    body('name').notEmpty().withMessage('Device name is required'),
    body('deviceCode').notEmpty().withMessage('Device code is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, deviceCode } = req.body;

        // Check if device code already exists
        let existingDevice = await Device.findOne({ deviceCode });
        if (existingDevice) {
            return res.status(400).json({ message: 'Device code already exists' });
        }

        const device = new Device({
            userId: req.user.id,
            name,
            deviceCode
        });

        await device.save();
        res.json(device);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete device
router.delete('/:id', auth, async (req, res) => {
    try {
        const device = await Device.findOne({ _id: req.params.id, userId: req.user.id });
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // Delete all logs for this device
        await DeviceLog.deleteMany({ deviceId: req.params.id });

        // Delete the device
        await device.deleteOne();

        res.json({ message: 'Device deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;