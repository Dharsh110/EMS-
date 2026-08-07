"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const CalendarEvent_1 = __importDefault(require("../models/CalendarEvent"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("../controllers/notificationController");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
// GET /api/v1/calendar?year=2025&month=6
router.get('/', async (req, res) => {
    try {
        const { year, month } = req.query;
        const filter = {};
        if (year && month) {
            const start = new Date(Number(year), Number(month) - 1, 1);
            const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
            filter.$or = [
                { startDate: { $gte: start, $lte: end } },
                { endDate: { $gte: start, $lte: end } },
                { startDate: { $lte: start }, endDate: { $gte: end } },
            ];
        }
        // Filter by role visibility
        const role = req.user?.role;
        const userId = req.user?._id;
        const visFilter = filter.$or ? [
            ...filter.$or.map((f) => ({ ...f, visibleTo: { $in: [role, 'all'] } })),
        ] : [{ visibleTo: { $in: [role, 'all'] } }];
        delete filter.$or;
        // Personal entries (an employee's own calendar note) are only visible to their creator,
        // even though they share the 'employee' visibleTo value with admin/manager broadcasts.
        filter.$and = [{ $or: visFilter }, { $or: [{ isPersonal: { $ne: true } }, { createdBy: userId }] }];
        const events = await CalendarEvent_1.default.find(filter).sort({ startDate: 1 });
        res.json({ success: true, data: events });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// POST /api/v1/calendar
router.post('/', async (req, res) => {
    try {
        const creatorRole = req.user.role;
        const isPersonal = creatorRole === 'employee' && req.body.visibleTo === 'employee';
        const event = await CalendarEvent_1.default.create({ ...req.body, createdBy: req.user._id, isPersonal });
        if (!isPersonal) {
            try {
                const creatorId = req.user._id.toString();
                const recipients = event.visibleTo === 'all'
                    ? await User_1.default.find({}).select('_id role')
                    : await User_1.default.find({ role: event.visibleTo }).select('_id role');
                for (const u of recipients) {
                    if (u._id.toString() === creatorId)
                        continue;
                    await (0, notificationController_1.createNotification)(u._id.toString(), u.role, 'calendar', 'New calendar event', `"${event.title}" was added to the calendar for ${event.startDate.toISOString().slice(0, 10)}.`, `/${u.role}/calendar`);
                }
            }
            catch { /* notification failure should not block event creation */ }
        }
        res.status(201).json({ success: true, data: event });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});
// PUT /api/v1/calendar/:id
router.put('/:id', async (req, res) => {
    try {
        const event = await CalendarEvent_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found' });
            return;
        }
        res.json({ success: true, data: event });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});
// DELETE /api/v1/calendar/:id
router.delete('/:id', async (req, res) => {
    try {
        await CalendarEvent_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Event deleted' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
exports.default = router;
