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
exports.markAttendance = exports.getAllAttendanceRecords = exports.getMonthlyReport = exports.getTodayAttendance = exports.getMyAttendance = exports.checkOut = exports.checkIn = void 0;
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Employee_1 = __importDefault(require("../models/Employee"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("./notificationController");
const getOrCreateEmployee = async (userId, userName, userEmail) => {
    let employee = await Employee_1.default.findOne({ user: userId });
    if (!employee) {
        const [firstName, ...rest] = (userName || userEmail || 'User').trim().split(' ');
        const count = await Employee_1.default.countDocuments();
        employee = await Employee_1.default.create({
            employeeCode: `EMP${String(count + 1).padStart(3, '0')}`,
            user: userId,
            firstName, lastName: rest.join(' ') || '-',
            email: userEmail || '',
            designation: 'Employee',
            joiningDate: new Date(),
            phone: '', workLocation: 'HQ',
        });
        // Keep User.employeeId in sync with the newly-created Employee — mirrors the
        // backfill authController.login already does — so role-filtered attendance
        // queries (e.g. admin's Manager Attendance tab) can find this record immediately.
        await User_1.default.findByIdAndUpdate(userId, { employeeId: employee._id });
    }
    return employee;
};
const checkIn = async (req, res) => {
    try {
        const employee = await getOrCreateEmployee(req.user?._id, req.user?.name, req.user?.email);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const existing = await Attendance_1.default.findOne({ employee: employee._id, date: today });
        if (existing?.checkIn) {
            res.status(400).json({ success: false, message: 'Already checked in today.' });
            return;
        }
        const attendance = existing
            ? await Attendance_1.default.findByIdAndUpdate(existing._id, { checkIn: new Date(), status: 'present' }, { new: true })
            : await Attendance_1.default.create({
                employee: employee._id,
                date: today,
                checkIn: new Date(),
                status: 'present',
                markedBy: req.user?._id,
            });
        if (attendance?.isLate) {
            try {
                const emp = await Employee_1.default.findById(employee._id).populate('department', 'name');
                const deptName = emp?.department?.name || '';
                const notifyUsers = await User_1.default.find({
                    $or: [
                        { role: 'admin' },
                        { role: 'manager', $or: [{ department: '' }, { department: { $exists: false } }, { department: null }] },
                        ...(deptName ? [{ role: 'manager', department: deptName }] : []),
                    ],
                }).select('_id role');
                for (const u of notifyUsers) {
                    await (0, notificationController_1.createNotification)(u._id.toString(), u.role, 'attendance', 'Late check-in', `${employee.firstName} ${employee.lastName} checked in late.`, u.role === 'admin' ? '/admin/attendance' : '/manager/attendance');
                }
            }
            catch { /* notification failure should not block check-in */ }
        }
        res.status(200).json({ success: true, data: attendance, message: 'Check-in recorded.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.checkIn = checkIn;
const checkOut = async (req, res) => {
    try {
        const employee = await getOrCreateEmployee(req.user?._id, req.user?.name, req.user?.email);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const attendance = await Attendance_1.default.findOne({ employee: employee._id, date: today });
        if (!attendance?.checkIn) {
            res.status(400).json({ success: false, message: 'No check-in found for today.' });
            return;
        }
        if (attendance.checkOut) {
            res.status(400).json({ success: false, message: 'Already checked out today.' });
            return;
        }
        attendance.checkOut = new Date();
        await attendance.save();
        res.status(200).json({ success: true, data: attendance, message: 'Check-out recorded.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.checkOut = checkOut;
const getMyAttendance = async (req, res) => {
    try {
        const employee = await getOrCreateEmployee(req.user?._id, req.user?.name, req.user?.email);
        const { month, year } = req.query;
        const m = Number(month) || new Date().getMonth() + 1;
        const y = Number(year) || new Date().getFullYear();
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);
        const records = await Attendance_1.default.find({
            employee: employee._id,
            date: { $gte: start, $lte: end },
        }).sort({ date: 1 });
        const summary = {
            present: records.filter((r) => r.status === 'present').length,
            absent: records.filter((r) => r.status === 'absent').length,
            late: records.filter((r) => r.isLate).length,
            leave: records.filter((r) => r.status === 'leave').length,
            totalHours: records.reduce((sum, r) => sum + (r.totalHours || 0), 0),
        };
        res.status(200).json({ success: true, data: records, summary });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyAttendance = getMyAttendance;
const getTodayAttendance = async (req, res) => {
    try {
        // Accepts an optional ?date=YYYY-MM-DD so the same raw-record (non-aggregated) shape
        // can back an exact single-day filter, not just "today" — defaults to today when absent.
        const { date, role } = req.query;
        const day = date ? new Date(date) : new Date();
        day.setUTCHours(0, 0, 0, 0);
        const attFilter = { date: day };
        const managerDept = req.user?.role === 'manager' ? req.user.department : '';
        if (managerDept) {
            const Department = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = await Department.findOne({ name: managerDept });
            if (deptDoc) {
                const emps = await Employee_1.default.find({ department: deptDoc._id }).select('_id');
                attFilter.employee = { $in: emps.map((e) => e._id) };
            }
        }
        // "Manager Attendance" view: role isn't stored on Employee, only on the linked
        // User, so resolve it via User.role before filtering the Employee-keyed Attendance collection.
        if (role) {
            const roleUsers = await User_1.default.find({ role }).select('employeeId');
            const roleEmpIds = roleUsers.map((u) => u.employeeId).filter(Boolean);
            attFilter.employee = attFilter.employee
                ? { $in: attFilter.employee.$in.filter((id) => roleEmpIds.some((r) => String(r) === String(id))) }
                : { $in: roleEmpIds };
        }
        const records = await Attendance_1.default.find(attFilter)
            .populate({
            path: 'employee',
            select: 'firstName lastName employeeCode avatar department',
            populate: { path: 'department', select: 'name' },
        })
            .sort({ checkIn: 1 });
        // Official Work Hours: sourced only from the APPROVED timesheet for the same
        // employee+date (never from clock-in/out) — kept as a separate figure per the spec.
        const Timesheet = (await Promise.resolve().then(() => __importStar(require('../models/Timesheet')))).default;
        const approvedTimesheets = await Timesheet.find({
            employee: { $in: records.map((r) => r.employee?._id).filter(Boolean) },
            date: day,
            status: 'approved',
        }).select('employee totalMinutes');
        const officialByEmployee = new Map(approvedTimesheets.map((t) => [String(t.employee), t.totalMinutes]));
        const recordsWithOfficialHours = records.map((r) => {
            const obj = r.toObject();
            obj.officialWorkMinutes = officialByEmployee.get(String(r.employee?._id)) ?? null;
            return obj;
        });
        const totalEmployees = await Employee_1.default.countDocuments({ status: 'active' });
        const present = records.filter((r) => r.status === 'present').length;
        const late = records.filter((r) => r.isLate).length;
        const onLeave = records.filter((r) => r.status === 'leave').length;
        const absent = totalEmployees - present - onLeave;
        res.status(200).json({
            success: true,
            data: recordsWithOfficialHours,
            summary: { totalEmployees, present, absent: Math.max(0, absent), late, onLeave },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTodayAttendance = getTodayAttendance;
const getMonthlyReport = async (req, res) => {
    try {
        const { month, year, department, role } = req.query;
        const m = Number(month) || new Date().getMonth() + 1;
        const y = Number(year) || new Date().getFullYear();
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);
        const matchStage = { date: { $gte: start, $lte: end } };
        // `department` here is a department NAME (as sent by the frontend), not an
        // ObjectId — resolve it before filtering Employee.department (which is a ref).
        const managerDept = req.user?.role === 'manager' ? req.user.department : '';
        const deptNameFilter = department || managerDept;
        let employeeIds = null;
        if (deptNameFilter) {
            const DeptModel = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = await DeptModel.findOne({ name: deptNameFilter });
            const emps = deptDoc ? await Employee_1.default.find({ department: deptDoc._id }).select('_id') : [];
            employeeIds = emps.map((e) => e._id);
        }
        // "Manager Attendance" view: role isn't stored on Employee, only on the linked
        // User, so resolve it via User.role and intersect with any department filter above.
        if (role) {
            const roleUsers = await User_1.default.find({ role }).select('employeeId');
            const roleEmpIds = roleUsers.map((u) => u.employeeId).filter(Boolean);
            employeeIds = employeeIds ? employeeIds.filter((id) => roleEmpIds.some((r) => String(r) === String(id))) : roleEmpIds;
        }
        if (employeeIds)
            matchStage.employee = { $in: employeeIds };
        const report = await Attendance_1.default.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$employee',
                    present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                    absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                    leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
                    halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
                    late: { $sum: { $cond: ['$isLate', 1, 0] } },
                    totalHours: { $sum: '$totalHours' },
                    overtimeHours: { $sum: '$overtimeHours' },
                },
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'employee',
                },
            },
            { $unwind: '$employee' },
            {
                $lookup: {
                    from: 'departments',
                    localField: 'employee.department',
                    foreignField: '_id',
                    as: 'deptInfo',
                },
            },
            { $addFields: { 'employee.department': { $arrayElemAt: ['$deptInfo', 0] } } },
            // Official Work Hours: summed only from APPROVED timesheets for the same
            // employee within this date range — a separate figure from clock-based totalHours.
            {
                $lookup: {
                    from: 'timesheets',
                    let: { empId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $and: [{ $eq: ['$employee', '$$empId'] }, { $eq: ['$status', 'approved'] }, { $gte: ['$date', start] }, { $lte: ['$date', end] }] } } },
                        { $group: { _id: null, total: { $sum: '$totalMinutes' } } },
                    ],
                    as: 'officialWork',
                },
            },
            { $addFields: { officialWorkMinutes: { $ifNull: [{ $arrayElemAt: ['$officialWork.total', 0] }, 0] } } },
            { $project: { deptInfo: 0, officialWork: 0 } },
        ]);
        res.status(200).json({ success: true, data: report });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMonthlyReport = getMonthlyReport;
// Flat list of individual daily attendance records (not the per-employee monthly
// aggregate from getMonthlyReport) — used by report pages that need real dates,
// check-in/out times, and per-day rows to drive Today/Week/Month/Year filtering.
const getAllAttendanceRecords = async (req, res) => {
    try {
        const { department, role, from, to, limit = 1000 } = req.query;
        const filter = {};
        if (from || to) {
            filter.date = {};
            if (from)
                filter.date.$gte = new Date(from);
            if (to)
                filter.date.$lte = new Date(to);
        }
        const managerDept = req.user?.role === 'manager' ? req.user.department : '';
        const deptNameFilter = department || managerDept;
        let employeeIds = null;
        if (deptNameFilter) {
            const DeptModel = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = await DeptModel.findOne({ name: deptNameFilter });
            const emps = deptDoc ? await Employee_1.default.find({ department: deptDoc._id }).select('_id') : [];
            employeeIds = emps.map((e) => e._id);
        }
        if (role) {
            const roleUsers = await User_1.default.find({ role }).select('employeeId');
            const roleEmpIds = roleUsers.map((u) => u.employeeId).filter(Boolean);
            employeeIds = employeeIds ? employeeIds.filter((id) => roleEmpIds.some((r) => String(r) === String(id))) : roleEmpIds;
        }
        if (employeeIds)
            filter.employee = { $in: employeeIds };
        // .lean() skips hydrating full Mongoose documents — this endpoint can return
        // up to `limit` populated records for a read-only report table, so avoiding
        // that overhead measurably cuts response time for the larger result sets.
        const records = await Attendance_1.default.find(filter)
            .populate({ path: 'employee', select: 'firstName lastName employeeCode department', populate: { path: 'department', select: 'name' } })
            .sort({ date: -1 })
            .limit(Number(limit))
            .lean();
        res.status(200).json({ success: true, data: records });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllAttendanceRecords = getAllAttendanceRecords;
const markAttendance = async (req, res) => {
    try {
        const { employeeId, date, status, checkIn, checkOut, notes } = req.body;
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        const attendance = await Attendance_1.default.findOneAndUpdate({ employee: employeeId, date: d }, { status, checkIn, checkOut, notes, markedBy: req.user?._id }, { new: true, upsert: true, runValidators: true });
        res.status(200).json({ success: true, data: attendance });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.markAttendance = markAttendance;
