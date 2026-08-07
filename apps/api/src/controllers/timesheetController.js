"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimesheetSummary = exports.rejectTimesheet = exports.approveTimesheet = exports.getAllTimesheets = exports.resubmitTimesheet = exports.submitTimesheet = exports.getMyTimesheets = exports.saveDraft = void 0;
const Timesheet_1 = __importDefault(require("../models/Timesheet"));
const Employee_1 = __importDefault(require("../models/Employee"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("./notificationController");
const dayStart = (d) => {
    const date = new Date(d);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};
// Turns a timesheet's entries into a short human-readable summary for notifications,
// e.g. "2 tasks (Authentication Module, Dashboard Development) — 3.0h" — so notifications
// carry real content instead of just a generic "submitted a timesheet" message.
const summarizeEntries = (entries) => {
    const taskNames = entries.map((e) => e.task).join(', ');
    const hours = (entries.reduce((s, e) => s + (e.timeSpentMinutes || 0), 0) / 60).toFixed(1);
    const truncated = taskNames.length > 80 ? `${taskNames.slice(0, 77)}...` : taskNames;
    return `${entries.length} task${entries.length !== 1 ? 's' : ''} (${truncated}) — ${hours}h`;
};
// Employee creates/updates their draft timesheet for a date. One document per
// employee per day — repeated calls upsert the same doc while it's still editable.
const saveDraft = async (req, res) => {
    try {
        const { date, entries } = req.body;
        const employee = await Employee_1.default.findOne({ user: req.user?._id });
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const day = dayStart(date);
        let timesheet = await Timesheet_1.default.findOne({ employee: employee._id, date: day });
        if (timesheet && !['draft', 'rejected'].includes(timesheet.status)) {
            res.status(400).json({ success: false, message: `Timesheet is ${timesheet.status.replace('_', ' ')} and can no longer be edited.` });
            return;
        }
        if (!timesheet) {
            timesheet = new Timesheet_1.default({
                employee: employee._id, date: day, entries: entries || [], status: 'draft',
                auditTrail: [{ action: 'created', by: req.user?._id, at: new Date() }],
            });
        }
        else {
            timesheet.entries = entries || [];
            timesheet.auditTrail.push({ action: 'updated', by: req.user?._id, at: new Date() });
        }
        await timesheet.save();
        res.status(200).json({ success: true, data: timesheet });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.saveDraft = saveDraft;
const getMyTimesheets = async (req, res) => {
    try {
        const employee = await Employee_1.default.findOne({ user: req.user?._id });
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const { from, to } = req.query;
        const filter = { employee: employee._id };
        if (from || to) {
            filter.date = {};
            if (from)
                filter.date.$gte = dayStart(from);
            if (to)
                filter.date.$lte = dayStart(to);
        }
        const timesheets = await Timesheet_1.default.find(filter).populate('approvedBy', 'name').sort({ date: -1 });
        res.status(200).json({ success: true, data: timesheets });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyTimesheets = getMyTimesheets;
const submitTimesheet = async (req, res) => {
    try {
        const employee = await Employee_1.default.findOne({ user: req.user?._id }).populate('department', 'name');
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const timesheet = await Timesheet_1.default.findOne({ _id: req.params.id, employee: employee._id });
        if (!timesheet) {
            res.status(404).json({ success: false, message: 'Timesheet not found.' });
            return;
        }
        if (timesheet.status !== 'draft') {
            res.status(400).json({ success: false, message: 'Only a draft timesheet can be submitted.' });
            return;
        }
        if (!timesheet.entries.length) {
            res.status(400).json({ success: false, message: 'Add at least one task entry before submitting.' });
            return;
        }
        timesheet.status = 'pending_approval';
        timesheet.submittedAt = new Date();
        timesheet.auditTrail.push({ action: 'submitted', by: req.user?._id, at: new Date() });
        await timesheet.save();
        const entrySummary = summarizeEntries(timesheet.entries);
        await notifyManagers(employee, `New timesheet submitted`, `${employee.firstName} ${employee.lastName} submitted a timesheet for ${timesheet.date.toISOString().slice(0, 10)}: ${entrySummary}.`);
        await (0, notificationController_1.createNotification)(String(req.user?._id), 'employee', 'timesheet', 'Timesheet submitted', `Your timesheet for ${timesheet.date.toISOString().slice(0, 10)} was submitted for approval: ${entrySummary}.`, '/employee/timesheet');
        res.status(200).json({ success: true, data: timesheet, message: 'Timesheet submitted for approval.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.submitTimesheet = submitTimesheet;
const resubmitTimesheet = async (req, res) => {
    try {
        const employee = await Employee_1.default.findOne({ user: req.user?._id });
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const timesheet = await Timesheet_1.default.findOne({ _id: req.params.id, employee: employee._id });
        if (!timesheet) {
            res.status(404).json({ success: false, message: 'Timesheet not found.' });
            return;
        }
        if (timesheet.status !== 'rejected') {
            res.status(400).json({ success: false, message: 'Only a rejected timesheet can be resubmitted.' });
            return;
        }
        const { entries } = req.body;
        if (Array.isArray(entries))
            timesheet.entries = entries;
        timesheet.status = 'pending_approval';
        timesheet.submittedAt = new Date();
        timesheet.rejectionReason = undefined;
        timesheet.auditTrail.push({ action: 'resubmitted', by: req.user?._id, at: new Date() });
        await timesheet.save();
        await notifyManagers(employee, `Timesheet resubmitted`, `${employee.firstName} ${employee.lastName} resubmitted their timesheet for ${timesheet.date.toISOString().slice(0, 10)}: ${summarizeEntries(timesheet.entries)}.`);
        res.status(200).json({ success: true, data: timesheet, message: 'Timesheet resubmitted for approval.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.resubmitTimesheet = resubmitTimesheet;
async function notifyManagers(employee, title, message) {
    try {
        const deptName = employee.department?.name || '';
        // Recipients: every admin, every Main Manager (department is empty/missing — they
        // have all-department oversight), and the specific department's own manager if the
        // employee has a department. Using $or (not a duplicate `role` key, which would
        // silently collapse to just the last clause) so all three groups are actually included.
        const recipients = await User_1.default.find({
            $or: [
                { role: 'admin' },
                { role: 'manager', $or: [{ department: '' }, { department: { $exists: false } }, { department: null }] },
                ...(deptName ? [{ role: 'manager', department: deptName }] : []),
            ],
        }).select('_id role');
        for (const r of recipients) {
            await (0, notificationController_1.createNotification)(r._id.toString(), r.role, 'timesheet', title, message, r.role === 'admin' ? '/admin/timesheets' : '/manager/timesheet-approvals', deptName || undefined);
        }
    }
    catch { /* notification failure should not block the workflow */ }
}
// Manager/Admin: list timesheets pending or already actioned, scoped to department.
const getAllTimesheets = async (req, res) => {
    try {
        const { status, department, employeeId, from, to, page = 1, limit = 100 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (from || to) {
            filter.date = {};
            if (from)
                filter.date.$gte = dayStart(from);
            if (to)
                filter.date.$lte = dayStart(to);
        }
        const managerDept = req.user?.role === 'manager' ? req.user.department : '';
        const deptNameFilter = department || managerDept;
        let employeeFilter = {};
        if (deptNameFilter) {
            const Department = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = await Department.findOne({ name: deptNameFilter });
            employeeFilter.department = deptDoc ? deptDoc._id : { $in: [] };
        }
        if (employeeId)
            employeeFilter._id = employeeId;
        if (Object.keys(employeeFilter).length) {
            const emps = await Employee_1.default.find(employeeFilter).select('_id');
            filter.employee = { $in: emps.map((e) => e._id) };
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [timesheets, total] = await Promise.all([
            Timesheet_1.default.find(filter)
                .populate({ path: 'employee', select: 'firstName lastName employeeCode avatar department', populate: { path: 'department', select: 'name' } })
                .populate('approvedBy', 'name')
                .skip(skip).limit(Number(limit)).sort({ date: -1 }).lean(),
            Timesheet_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true, data: timesheets,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllTimesheets = getAllTimesheets;
const approveTimesheet = async (req, res) => {
    try {
        const timesheet = await Timesheet_1.default.findById(req.params.id).populate('employee');
        if (!timesheet) {
            res.status(404).json({ success: false, message: 'Timesheet not found.' });
            return;
        }
        if (timesheet.status !== 'pending_approval') {
            res.status(400).json({ success: false, message: 'Only a pending timesheet can be approved.' });
            return;
        }
        timesheet.status = 'approved';
        timesheet.approvedBy = req.user?._id;
        timesheet.approvedAt = new Date();
        timesheet.auditTrail.push({ action: 'approved', by: req.user?._id, at: new Date() });
        await timesheet.save();
        const empUserId = timesheet.employee?.user;
        if (empUserId) {
            await (0, notificationController_1.createNotification)(empUserId.toString(), 'employee', 'timesheet', 'Timesheet approved', `Your timesheet for ${timesheet.date.toISOString().slice(0, 10)} was approved: ${summarizeEntries(timesheet.entries)}. These hours now count toward your official work hours.`, '/employee/timesheet');
        }
        res.status(200).json({ success: true, data: timesheet, message: 'Timesheet approved.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.approveTimesheet = approveTimesheet;
const rejectTimesheet = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason || !String(reason).trim()) {
            res.status(400).json({ success: false, message: 'A rejection reason is required.' });
            return;
        }
        const timesheet = await Timesheet_1.default.findById(req.params.id).populate('employee');
        if (!timesheet) {
            res.status(404).json({ success: false, message: 'Timesheet not found.' });
            return;
        }
        if (timesheet.status !== 'pending_approval') {
            res.status(400).json({ success: false, message: 'Only a pending timesheet can be rejected.' });
            return;
        }
        timesheet.status = 'rejected';
        timesheet.rejectionReason = String(reason).trim();
        timesheet.approvedBy = req.user?._id;
        timesheet.approvedAt = new Date();
        timesheet.auditTrail.push({ action: 'rejected', by: req.user?._id, at: new Date(), note: reason });
        await timesheet.save();
        const empUserId = timesheet.employee?.user;
        if (empUserId) {
            await (0, notificationController_1.createNotification)(empUserId.toString(), 'employee', 'timesheet', 'Timesheet rejected', `Your timesheet for ${timesheet.date.toISOString().slice(0, 10)} (${summarizeEntries(timesheet.entries)}) was rejected: ${reason}`, '/employee/timesheet');
        }
        res.status(200).json({ success: true, data: timesheet, message: 'Timesheet rejected.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.rejectTimesheet = rejectTimesheet;
// Admin/Manager reporting: approved/pending/rejected hours + counts, with filters.
const getTimesheetSummary = async (req, res) => {
    try {
        const { from, to, department, employeeId } = req.query;
        const filter = {};
        if (from || to) {
            filter.date = {};
            if (from)
                filter.date.$gte = dayStart(from);
            if (to)
                filter.date.$lte = dayStart(to);
        }
        const managerDept = req.user?.role === 'manager' ? req.user.department : '';
        const deptNameFilter = department || managerDept;
        let employeeFilter = {};
        if (deptNameFilter) {
            const Department = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = await Department.findOne({ name: deptNameFilter });
            employeeFilter.department = deptDoc ? deptDoc._id : { $in: [] };
        }
        if (employeeId)
            employeeFilter._id = employeeId;
        if (Object.keys(employeeFilter).length) {
            const emps = await Employee_1.default.find(employeeFilter).select('_id');
            filter.employee = { $in: emps.map((e) => e._id) };
        }
        const timesheets = await Timesheet_1.default.find(filter)
            .populate({ path: 'employee', select: 'firstName lastName employeeCode department', populate: { path: 'department', select: 'name' } });
        const hoursOf = (list) => list.reduce((s, t) => s + t.totalMinutes / 60, 0);
        const approved = timesheets.filter((t) => t.status === 'approved');
        const pending = timesheets.filter((t) => t.status === 'pending_approval');
        const rejected = timesheets.filter((t) => t.status === 'rejected');
        res.status(200).json({
            success: true,
            summary: {
                approvedHours: Math.round(hoursOf(approved) * 100) / 100,
                pendingHours: Math.round(hoursOf(pending) * 100) / 100,
                rejectedHours: Math.round(hoursOf(rejected) * 100) / 100,
                approvedCount: approved.length,
                rejectedCount: rejected.length,
                pendingCount: pending.length,
                totalCount: timesheets.length,
            },
            data: timesheets,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTimesheetSummary = getTimesheetSummary;
