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
exports.getDashboardStats = exports.updateMyProfile = exports.getMyProfile = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployee = exports.getAllEmployees = void 0;
const Employee_1 = __importDefault(require("../models/Employee"));
const User_1 = __importDefault(require("../models/User"));
const crypto_1 = __importDefault(require("crypto"));
const email_1 = require("../utils/email");
const generateEmployeeCode = async () => {
    const count = await Employee_1.default.countDocuments();
    return `EMP${String(count + 1).padStart(3, '0')}`;
};
const getAllEmployees = async (req, res) => {
    try {
        const { department, status, search, page = 1, limit = 1000 } = req.query;
        const filter = {};
        // Dept managers (req.user.department set) are auto-scoped to their own
        // department unless an explicit `department` filter is passed (e.g. by the
        // main manager, whose department is empty and who can filter by any dept).
        const managerDept = req.user?.role === 'manager' ? req.user.department : '';
        const deptNameFilter = department || managerDept;
        // `department` may arrive as a department NAME (frontend convention) or an
        // ObjectId — resolve names before filtering the ObjectId-ref `department` path.
        if (deptNameFilter) {
            if (/^[0-9a-fA-F]{24}$/.test(deptNameFilter)) {
                filter.department = deptNameFilter;
            }
            else {
                const DeptModel = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
                const deptDoc = await DeptModel.findOne({ name: deptNameFilter });
                filter.department = deptDoc ? deptDoc._id : { $in: [] };
            }
        }
        if (status)
            filter.status = status;
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { employeeCode: { $regex: search, $options: 'i' } },
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [employees, total] = await Promise.all([
            Employee_1.default.find(filter)
                .populate('department', 'name code')
                .populate('reportingTo', 'firstName lastName')
                .populate('user', 'role')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            Employee_1.default.countDocuments(filter),
        ]);
        // Flatten the populated user's role onto the employee object so the frontend can
        // filter by role (e.g. "Manager Attendance" employee-select) without a second lookup.
        const withRole = employees.map((e) => {
            const obj = e.toObject();
            obj.role = obj.user?.role;
            return obj;
        });
        res.status(200).json({
            success: true,
            data: withRole,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllEmployees = getAllEmployees;
const getEmployee = async (req, res) => {
    try {
        const employee = await Employee_1.default.findById(req.params.id)
            .populate('department', 'name code')
            .populate('reportingTo', 'firstName lastName designation')
            .populate('user', 'email role lastLogin');
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        res.status(200).json({ success: true, data: employee });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getEmployee = getEmployee;
const createEmployee = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, department, designation, joiningDate, salary, reportingTo, workLocation, employmentType, role = 'employee', employeeCode: requestedCode } = req.body;
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email already registered.' });
            return;
        }
        // Admin can set the Employee ID directly (used as a login identifier alongside
        // email) — validate it's unique before creating anything. Falls back to
        // auto-generation only if the admin leaves it blank.
        let employeeCode;
        if (requestedCode && String(requestedCode).trim()) {
            employeeCode = String(requestedCode).trim().toUpperCase();
            const codeTaken = await Employee_1.default.findOne({ employeeCode });
            if (codeTaken) {
                res.status(400).json({ success: false, message: `Employee ID "${employeeCode}" is already in use.` });
                return;
            }
        }
        else {
            employeeCode = await generateEmployeeCode();
        }
        // `department` arrives as a NAME (frontend convention, e.g. "Engineering"), but
        // Employee.department is an ObjectId ref — resolve it before saving, same pattern
        // used across the other controllers (attendance/tasks/daily-reports).
        let deptObjectId = undefined;
        let deptName = '';
        if (department) {
            const DeptModel = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = /^[0-9a-fA-F]{24}$/.test(department)
                ? await DeptModel.findById(department)
                : await DeptModel.findOne({ name: department });
            if (deptDoc) {
                deptObjectId = deptDoc._id;
                deptName = deptDoc.name;
            }
        }
        const tempPassword = crypto_1.default.randomBytes(6).toString('hex');
        const user = await User_1.default.create({
            name: `${firstName} ${lastName}`, email, password: tempPassword, role,
            // Dept managers are scoped to their department name; a manager created with no
            // department is a "main manager" with all-department access (existing convention).
            department: role === 'manager' ? deptName : '',
        });
        const employee = await Employee_1.default.create({
            employeeCode, user: user._id, firstName, lastName, email, phone,
            department: deptObjectId, designation, joiningDate: joiningDate || new Date(),
            salary, reportingTo, workLocation, employmentType,
        });
        user.employeeId = employee._id;
        await user.save({ validateBeforeSave: false });
        let emailSent = false;
        try {
            await (0, email_1.sendEmail)({
                to: email,
                subject: 'Welcome to ZetaQ EMS — Your Account Details',
                html: (0, email_1.welcomeEmailHtml)(`${firstName} ${lastName}`, role, tempPassword),
            });
            emailSent = true;
        }
        catch (_) { /* SMTP may not be configured — credentials are still returned below */ }
        res.status(201).json({
            success: true,
            data: employee,
            // Only an admin sees this response — safe to return so they can hand the new
            // hire their login details even when the welcome email couldn't be delivered.
            credentials: { email, employeeCode, tempPassword },
            message: emailSent ? 'Employee created and welcome email sent.' : 'Employee created. Welcome email could not be sent — share the credentials shown below manually.',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    try {
        // Managers can only edit their own department's team (dept-scoped managers)
        // or anyone (the unscoped main manager); they're also limited to HR-safe
        // fields — never department/role/reportingTo, which stay admin-only.
        let updates = req.body;
        if (req.user?.role === 'manager') {
            const managerDept = req.user.department;
            if (managerDept) {
                const target = await Employee_1.default.findById(req.params.id).populate('department', 'name');
                const targetDept = target?.department && typeof target.department === 'object' ? target.department.name : '';
                if (!target || targetDept !== managerDept) {
                    res.status(403).json({ success: false, message: 'You can only manage employees in your own department.' });
                    return;
                }
            }
            const { phone, designation, employmentType, status, salary, gender } = req.body;
            updates = { phone, designation, employmentType, status, salary, gender };
        }
        const employee = await Employee_1.default.findByIdAndUpdate(req.params.id, updates, {
            new: true, runValidators: true,
        }).populate('department', 'name code').populate('reportingTo', 'firstName lastName');
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        // Employee.status is the HR record's status, but login is gated on User.isActive —
        // keep them in sync so deactivating/reactivating an employee here actually blocks
        // or restores their ability to log in (previously these two flags could drift apart).
        if (req.body.status && employee.user) {
            await User_1.default.findByIdAndUpdate(employee.user, { isActive: req.body.status === 'active' });
        }
        res.status(200).json({ success: true, data: employee });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateEmployee = updateEmployee;
const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee_1.default.findById(req.params.id);
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        await User_1.default.findByIdAndUpdate(employee.user, { isActive: false });
        await Employee_1.default.findByIdAndUpdate(req.params.id, { status: 'inactive' });
        res.status(200).json({ success: true, message: 'Employee deactivated.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteEmployee = deleteEmployee;
const getMyProfile = async (req, res) => {
    try {
        const employee = await Employee_1.default.findOne({ user: req.user?._id })
            .populate('department', 'name code')
            .populate('reportingTo', 'firstName lastName designation')
            .populate('user', 'name email role department');
        // Return null data (not 404) so frontend shows empty profile gracefully
        res.status(200).json({ success: true, data: employee || null });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyProfile = getMyProfile;
const updateMyProfile = async (req, res) => {
    try {
        const allowedFields = ['phone', 'address', 'emergencyContact', 'avatar',
            'firstName', 'lastName', 'designation', 'gender', 'dateOfBirth', 'bloodGroup',
            'skills', 'bio', 'workLocation', 'bankDetails', 'preferences'];
        const updates = {};
        allowedFields.forEach((f) => { if (req.body[f] !== undefined)
            updates[f] = req.body[f]; });
        // Deep-merge preferences so partial saves (e.g. only notifications) don't erase other keys
        if (updates.preferences) {
            const existing = await Employee_1.default.findOne({ user: req.user?._id }).select('preferences').lean();
            const merged = { ...(existing?.preferences || {}), ...updates.preferences };
            // Also merge nested sub-objects (notifications, privacy, ui)
            for (const sub of ['notifications', 'privacy', 'ui']) {
                if (updates.preferences[sub] && existing?.preferences?.[sub]) {
                    merged[sub] = { ...existing.preferences[sub], ...updates.preferences[sub] };
                }
            }
            updates.preferences = merged;
        }
        let employee = await Employee_1.default.findOneAndUpdate({ user: req.user?._id }, updates, {
            new: true, runValidators: false,
        }).populate('department', 'name code').populate('user', 'name email role department');
        // Create profile if it doesn't exist yet (shouldn't happen after register fix, but safety net)
        if (!employee && req.user) {
            const user = req.user;
            const [firstName, ...rest] = (user.name || 'User').split(' ');
            const empCode = await generateEmployeeCode();
            employee = await Employee_1.default.create({
                employeeCode: empCode,
                user: user._id,
                firstName: updates.firstName || firstName,
                lastName: updates.lastName || (rest.join(' ') || '-'),
                email: user.email,
                designation: updates.designation || 'Employee',
                joiningDate: new Date(),
                ...updates,
            });
        }
        res.status(200).json({ success: true, data: employee });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateMyProfile = updateMyProfile;
const getDashboardStats = async (req, res) => {
    try {
        const managerDept = req.user?.role === 'manager' ? req.user.department : '';
        const filter = {};
        if (managerDept) {
            const DeptModel = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = await DeptModel.findOne({ name: managerDept });
            filter.department = deptDoc ? deptDoc._id : { $in: [] };
        }
        const [total, active, inactive] = await Promise.all([
            Employee_1.default.countDocuments(filter),
            Employee_1.default.countDocuments({ ...filter, status: 'active' }),
            Employee_1.default.countDocuments({ ...filter, status: 'inactive' }),
        ]);
        const byDept = await Employee_1.default.aggregate([
            { $match: { status: 'active', ...filter } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
            { $unwind: '$dept' },
            { $project: { name: '$dept.name', count: 1 } },
        ]);
        res.status(200).json({ success: true, data: { total, active, inactive, byDepartment: byDept } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDashboardStats = getDashboardStats;
