"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCalendarReminderJob = startCalendarReminderJob;
const CalendarEvent_1 = __importDefault(require("../models/CalendarEvent"));
const User_1 = __importDefault(require("../models/User"));
const Employee_1 = __importDefault(require("../models/Employee"));
const notificationController_1 = require("../controllers/notificationController");
// Notifies the relevant audience of a calendar event one day before it starts.
// `reminderSent` guards against re-notifying on every tick once a reminder has gone out.
async function sendDueReminders() {
    try {
        const now = new Date();
        const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
        const dueEvents = await CalendarEvent_1.default.find({
            startDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
            reminderSent: { $ne: true },
        });
        for (const event of dueEvents) {
            let recipients = [];
            if (event.isPersonal) {
                // Personal calendar entries only ever notify their own creator, never the whole employee pool.
                const creator = await User_1.default.find({ _id: event.createdBy }).select('_id role');
                recipients = creator;
            }
            else if (event.visibleTo === 'all') {
                recipients = await User_1.default.find({}).select('_id role');
            }
            else if (event.visibleTo === 'team') {
                // "team" events are visibleTo employees within the creator's department — resolve via Employee.
                const creatorEmp = await Employee_1.default.findOne({ user: event.createdBy }).populate('department', 'name');
                const deptName = creatorEmp?.department?.name;
                if (deptName) {
                    const deptEmployees = await Employee_1.default.find({ department: creatorEmp.department._id }).select('user');
                    const userIds = deptEmployees.map((e) => e.user).filter(Boolean);
                    recipients = await User_1.default.find({ _id: { $in: userIds } }).select('_id role');
                }
            }
            else {
                recipients = await User_1.default.find({ role: event.visibleTo }).select('_id role');
            }
            for (const u of recipients) {
                await (0, notificationController_1.createNotification)(u._id.toString(), u.role, 'calendar', `Reminder: ${event.title}`, `"${event.title}" is scheduled for tomorrow (${event.startDate.toISOString().slice(0, 10)}).`, `/${u.role}/calendar`);
            }
            event.reminderSent = true;
            await event.save();
        }
    }
    catch (err) {
        console.error('Calendar reminder job failed:', err);
    }
}
// Runs once on boot, then hourly — cheap enough for this event volume and avoids needing
// a dedicated cron dependency just for a once-a-day reminder sweep.
function startCalendarReminderJob() {
    sendDueReminders();
    setInterval(sendDueReminders, 60 * 60 * 1000);
}
