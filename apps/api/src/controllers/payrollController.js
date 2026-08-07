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
exports.processPayment = exports.getMyPayslips = exports.getAllPayroll = exports.generatePayroll = void 0;
const Payroll_1 = __importDefault(require("../models/Payroll"));
const Employee_1 = __importDefault(require("../models/Employee"));
const Attendance_1 = __importDefault(require("../models/Attendance"));
const notificationController_1 = require("./notificationController");
const generatePayroll = async (req, res) => {
    try {
        const { employeeId, month, year } = req.body;
        const employee = await Employee_1.default.findById(employeeId);
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const existing = await Payroll_1.default.findOne({ employee: employeeId, month, year });
        if (existing) {
            res.status(400).json({ success: false, message: 'Payroll already generated for this period.' });
            return;
        }
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);
        const attendance = await Attendance_1.default.find({
            employee: employeeId,
            date: { $gte: start, $lte: end },
        });
        const presentDays = attendance.filter((a) => a.status === 'present').length;
        const leaveDays = attendance.filter((a) => a.status === 'leave').length;
        const overtimeHours = attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
        const basicSalary = employee.salary || 50000;
        const hra = Math.round(basicSalary * 0.4);
        const transport = 2000;
        const medical = 1500;
        const pf = Math.round(basicSalary * 0.12);
        const tax = basicSalary > 50000 ? Math.round(basicSalary * 0.1) : 0;
        const overtimePay = Math.round((basicSalary / 26 / 8) * 1.5 * overtimeHours);
        const payroll = await Payroll_1.default.create({
            employee: employeeId,
            month, year, basicSalary,
            allowances: { hra, transport, medical, other: 0 },
            deductions: { pf, tax, other: 0 },
            presentDays, leaveDays, workingDays: 26,
            overtime: overtimeHours, overtimePay,
            processedBy: req.user?._id,
            processedAt: new Date(),
            status: 'processed',
        });
        res.status(201).json({ success: true, data: payroll });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.generatePayroll = generatePayroll;
const getAllPayroll = async (req, res) => {
    try {
        const { month, year, status, department, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (month)
            filter.month = Number(month);
        if (year)
            filter.year = Number(year);
        if (status)
            filter.status = status;
        // `department` here is a department NAME (as sent by the frontend), not an
        // ObjectId — resolve it before filtering Employee.department (which is a ref).
        if (department) {
            const DeptModel = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = await DeptModel.findOne({ name: department });
            const employees = deptDoc ? await Employee_1.default.find({ department: deptDoc._id }).select('_id') : [];
            filter.employee = { $in: employees.map((e) => e._id) };
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [payrolls, total] = await Promise.all([
            Payroll_1.default.find(filter)
                .populate({ path: 'employee', select: 'firstName lastName employeeCode department', populate: { path: 'department', select: 'name' } })
                .skip(skip).limit(Number(limit)).sort({ year: -1, month: -1 }).lean(),
            Payroll_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true, data: payrolls,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllPayroll = getAllPayroll;
const getMyPayslips = async (req, res) => {
    try {
        const employee = await Employee_1.default.findOne({ user: req.user?._id });
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const payslips = await Payroll_1.default.find({ employee: employee._id }).sort({ year: -1, month: -1 });
        res.status(200).json({ success: true, data: payslips });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyPayslips = getMyPayslips;
const processPayment = async (req, res) => {
    try {
        const payroll = await Payroll_1.default.findByIdAndUpdate(req.params.id, { status: 'paid', paidAt: new Date() }, { new: true });
        if (!payroll) {
            res.status(404).json({ success: false, message: 'Payroll record not found.' });
            return;
        }
        try {
            const employee = await Employee_1.default.findById(payroll.employee);
            if (employee?.user) {
                await (0, notificationController_1.createNotification)(employee.user.toString(), 'employee', 'payroll', 'Payslip paid', `Your salary for ${payroll.month}/${payroll.year} has been paid.`, '/employee/payslips');
            }
        }
        catch { /* notification failure should not block payment processing */ }
        res.status(200).json({ success: true, data: payroll, message: 'Payment processed.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.processPayment = processPayment;
