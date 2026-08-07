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
exports.cancelLeave = exports.updateLeaveStatus = exports.getAllLeaves = exports.getMyLeaves = exports.applyLeave = void 0;
const Leave_1 = __importDefault(require("../models/Leave"));
const Employee_1 = __importDefault(require("../models/Employee"));
const Attendance_1 = __importDefault(require("../models/Attendance"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("./notificationController");
const applyLeave = async (req, res) => {
    try {
        const { leaveType, fromDate, toDate, reason } = req.body;
        const employee = await Employee_1.default.findOne({ user: req.user?._id });
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const from = new Date(fromDate);
        const to = new Date(toDate);
        if (from > to) {
            res.status(400).json({ success: false, message: 'From date cannot be after to date.' });
            return;
        }
        const overlap = await Leave_1.default.findOne({
            employee: employee._id,
            status: { $in: ['pending', 'approved'] },
            $or: [{ fromDate: { $lte: to }, toDate: { $gte: from } }],
        });
        if (overlap) {
            res.status(400).json({ success: false, message: 'You already have a leave request for these dates.' });
            return;
        }
        const diffTime = Math.abs(to.getTime() - from.getTime());
        const totalDays = leaveType === 'half_day' ? 0.5 : Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const leave = await Leave_1.default.create({
            employee: employee._id,
            leaveType, fromDate: from, toDate: to, totalDays, reason,
        });
        try {
            const populatedEmp = await Employee_1.default.findById(employee._id).populate('department', 'name');
            const deptName = populatedEmp?.department?.name || '';
            const recipients = await User_1.default.find({
                $or: [
                    { role: 'admin' },
                    { role: 'manager', $or: [{ department: '' }, { department: { $exists: false } }, { department: null }] },
                    ...(deptName ? [{ role: 'manager', department: deptName }] : []),
                ],
            }).select('_id role');
            for (const r of recipients) {
                await (0, notificationController_1.createNotification)(r._id.toString(), r.role, 'leave', 'New leave request', `${employee.firstName} ${employee.lastName} applied for ${leaveType} leave (${totalDays} day${totalDays === 1 ? '' : 's'})`, r.role === 'admin' ? '/admin/leaves' : '/manager/leaves', deptName || undefined);
            }
        }
        catch { /* notification failure should not block leave application */ }
        res.status(201).json({ success: true, data: leave, message: 'Leave application submitted.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.applyLeave = applyLeave;
const getMyLeaves = async (req, res) => {
    try {
        const employee = await Employee_1.default.findOne({ user: req.user?._id });
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const leaves = await Leave_1.default.find({ employee: employee._id })
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });
        const summary = {
            casual: leaves.filter((l) => l.leaveType === 'casual' && l.status === 'approved').reduce((s, l) => s + l.totalDays, 0),
            sick: leaves.filter((l) => l.leaveType === 'sick' && l.status === 'approved').reduce((s, l) => s + l.totalDays, 0),
            earned: leaves.filter((l) => l.leaveType === 'earned' && l.status === 'approved').reduce((s, l) => s + l.totalDays, 0),
        };
        res.status(200).json({ success: true, data: leaves, summary });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyLeaves = getMyLeaves;
const getAllLeaves = async (req, res) => {
    try {
        const { status, department, leaveType, page = 1, limit = 100 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (leaveType)
            filter.leaveType = leaveType;
        // `department` here is a department NAME (as sent by the frontend), not an
        // ObjectId — resolve it before filtering Employee.department (which is a ref).
        const managerDept = req.user?.role === 'manager' ? req.user.department : '';
        const deptNameFilter = department || managerDept;
        if (deptNameFilter) {
            const Department = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = await Department.findOne({ name: deptNameFilter });
            const emps = deptDoc ? await Employee_1.default.find({ department: deptDoc._id }).select('_id') : [];
            filter.employee = { $in: emps.map((e) => e._id) };
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [leaves, total] = await Promise.all([
            Leave_1.default.find(filter)
                .populate({ path: 'employee', select: 'firstName lastName employeeCode avatar department', populate: { path: 'department', select: 'name' } })
                .populate('approvedBy', 'name')
                .skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
            Leave_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true, data: leaves,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllLeaves = getAllLeaves;
const updateLeaveStatus = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const leave = await Leave_1.default.findById(req.params.id).populate('employee');
        if (!leave) {
            res.status(404).json({ success: false, message: 'Leave request not found.' });
            return;
        }
        leave.status = status;
        leave.approvedBy = req.user?._id;
        leave.approvedAt = new Date();
        if (rejectionReason)
            leave.rejectionReason = rejectionReason;
        await leave.save();
        if (status === 'approved') {
            const from = new Date(leave.fromDate);
            const to = new Date(leave.toDate);
            const current = new Date(from);
            while (current <= to) {
                const d = new Date(current);
                d.setUTCHours(0, 0, 0, 0);
                await Attendance_1.default.findOneAndUpdate({ employee: leave.employee._id, date: d }, { status: 'leave', markedBy: req.user?._id }, { upsert: true });
                current.setDate(current.getDate() + 1);
            }
        }
        try {
            const empUserId = leave.employee?.user;
            if (empUserId) {
                await (0, notificationController_1.createNotification)(empUserId.toString(), 'employee', 'leave', `Leave ${status}`, `Your ${leave.leaveType} leave request was ${status}${rejectionReason ? `: ${rejectionReason}` : '.'}`, '/employee/leaves');
            }
        }
        catch { /* notification failure should not block leave status update */ }
        res.status(200).json({ success: true, data: leave, message: `Leave ${status}.` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateLeaveStatus = updateLeaveStatus;
const cancelLeave = async (req, res) => {
    try {
        const leave = await Leave_1.default.findOne({ _id: req.params.id });
        if (!leave) {
            res.status(404).json({ success: false, message: 'Leave not found.' });
            return;
        }
        if (leave.status !== 'pending') {
            res.status(400).json({ success: false, message: 'Only pending leaves can be cancelled.' });
            return;
        }
        leave.status = 'cancelled';
        await leave.save();
        res.status(200).json({ success: true, message: 'Leave cancelled.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.cancelLeave = cancelLeave;
