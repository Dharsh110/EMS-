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
exports.deleteTask = exports.addComment = exports.submitTaskUpdate = exports.updateTask = exports.getMyTasks = exports.getAllTasks = exports.createTask = void 0;
const Task_1 = __importDefault(require("../models/Task"));
const Employee_1 = __importDefault(require("../models/Employee"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("./notificationController");
const createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, dueDate, priority, hoursEstimated, tags, department, link, attachments } = req.body;
        // Neither the Admin nor the Manager "Assign Task" UI sends `department` —
        // derive it from the assignee's own Employee record so this task is still
        // visible to department-scoped views (dept manager Task Review, the
        // department breakdown stats) that filter strictly on Task.department.
        let taskDepartment = department;
        if (!taskDepartment && assignedTo) {
            const assigneeEmployee = await Employee_1.default.findById(assignedTo).select('department');
            taskDepartment = assigneeEmployee?.department;
        }
        const task = await Task_1.default.create({
            title, description, assignedTo, assignedBy: req.user?._id,
            dueDate, priority, hoursEstimated, tags, department: taskDepartment, link, attachments,
        });
        const populated = await Task_1.default.findById(task._id)
            .populate({
            path: 'assignedTo',
            select: 'firstName lastName employeeCode department',
            populate: { path: 'department', select: 'name' },
        })
            .populate('assignedBy', 'name')
            .populate('department', 'name');
        const assignee = await Employee_1.default.findById(assignedTo);
        if (assignee?.user) {
            await (0, notificationController_1.createNotification)(assignee.user.toString(), 'employee', 'task', 'New task assigned', `You've been assigned: "${title}"`, '/employee/tasks');
        }
        res.status(201).json({ success: true, data: populated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createTask = createTask;
const getAllTasks = async (req, res) => {
    try {
        const { status, priority, assignedTo, department, page = 1, limit = 100 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (priority)
            filter.priority = priority;
        if (assignedTo)
            filter.assignedTo = assignedTo;
        // `department` here is a department NAME (as sent by the frontend), not an
        // ObjectId — resolve it before filtering the ObjectId-ref `department` path.
        const managerDept = req.user?.role === 'manager' ? req.user.department : '';
        const deptNameFilter = department || managerDept;
        if (deptNameFilter) {
            const deptDoc = await (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default.findOne({ name: deptNameFilter });
            filter.department = deptDoc ? deptDoc._id : { $in: [] };
        }
        const overdueCutoff = new Date();
        await Task_1.default.updateMany({ dueDate: { $lt: overdueCutoff }, status: { $in: ['pending', 'in_progress'] } }, { status: 'overdue' });
        const skip = (Number(page) - 1) * Number(limit);
        const [tasks, total] = await Promise.all([
            Task_1.default.find(filter)
                .populate({
                path: 'assignedTo',
                select: 'firstName lastName employeeCode avatar department',
                populate: { path: 'department', select: 'name' },
            })
                .populate('assignedBy', 'name')
                .populate('department', 'name')
                .skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
            Task_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true, data: tasks,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllTasks = getAllTasks;
const getMyTasks = async (req, res) => {
    try {
        const employee = await Employee_1.default.findOne({ user: req.user?._id });
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const tasks = await Task_1.default.find({ assignedTo: employee._id })
            .populate('assignedBy', 'name')
            .sort({ dueDate: 1 });
        const summary = {
            pending: tasks.filter((t) => t.status === 'pending').length,
            in_progress: tasks.filter((t) => t.status === 'in_progress').length,
            completed: tasks.filter((t) => t.status === 'completed').length,
            overdue: tasks.filter((t) => t.status === 'overdue').length,
        };
        res.status(200).json({ success: true, data: tasks, summary });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyTasks = getMyTasks;
const updateTask = async (req, res) => {
    try {
        const task = await Task_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('assignedTo', 'firstName lastName')
            .populate('assignedBy', 'name');
        if (!task) {
            res.status(404).json({ success: false, message: 'Task not found.' });
            return;
        }
        res.status(200).json({ success: true, data: task });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateTask = updateTask;
const submitTaskUpdate = async (req, res) => {
    try {
        const { hoursWorked, submittedDescription, status, submittedFiles } = req.body;
        const employee = await Employee_1.default.findOne({ user: req.user?._id });
        if (!employee) {
            res.status(403).json({ success: false, message: 'Employee not found.' });
            return;
        }
        const task = await Task_1.default.findOne({ _id: req.params.id, assignedTo: employee._id });
        if (!task) {
            res.status(404).json({ success: false, message: 'Task not found or not assigned to you.' });
            return;
        }
        task.hoursWorked = hoursWorked || task.hoursWorked;
        task.submittedDescription = submittedDescription;
        task.submittedAt = new Date();
        if (Array.isArray(submittedFiles))
            task.submittedFiles = submittedFiles;
        if (status)
            task.status = status;
        await task.save();
        if (status === 'cancelled') {
            try {
                const populatedEmp = await Employee_1.default.findById(employee._id).populate('department', 'name');
                const deptName = populatedEmp?.department?.name || '';
                const notifyUsers = await User_1.default.find({
                    $or: [
                        { role: 'admin' },
                        { role: 'manager', $or: [{ department: '' }, { department: { $exists: false } }, { department: null }] },
                        ...(deptName ? [{ role: 'manager', department: deptName }] : []),
                    ],
                }).select('_id role');
                for (const u of notifyUsers) {
                    await (0, notificationController_1.createNotification)(u._id.toString(), u.role, 'task', 'Task cancelled', `${employee.firstName} ${employee.lastName} cancelled "${task.title}". Reason: ${submittedDescription || 'No reason given'}`, u.role === 'admin' ? '/admin/tasks' : '/manager/tasks', deptName || undefined);
                }
            }
            catch { /* notification failure should not block cancellation */ }
        }
        else if (task.assignedBy) {
            const assigner = await User_1.default.findById(task.assignedBy).select('role');
            if (assigner) {
                const populatedEmp = await Employee_1.default.findById(employee._id).populate('department', 'name');
                const deptName = populatedEmp?.department?.name || '';
                await (0, notificationController_1.createNotification)(task.assignedBy.toString(), assigner.role, 'task', 'Task submitted', `${employee.firstName} ${employee.lastName} submitted an update for "${task.title}"`, assigner.role === 'admin' ? '/admin/tasks' : '/manager/tasks', deptName || undefined);
            }
        }
        res.status(200).json({ success: true, data: task, message: 'Task update submitted.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.submitTaskUpdate = submitTaskUpdate;
const addComment = async (req, res) => {
    try {
        const task = await Task_1.default.findById(req.params.id);
        if (!task) {
            res.status(404).json({ success: false, message: 'Task not found.' });
            return;
        }
        task.comments.push({ author: req.user?._id, text: req.body.text, createdAt: new Date() });
        await task.save();
        const updated = await Task_1.default.findById(task._id).populate('comments.author', 'name avatar');
        res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.addComment = addComment;
const deleteTask = async (req, res) => {
    try {
        const task = await Task_1.default.findByIdAndDelete(req.params.id);
        if (!task) {
            res.status(404).json({ success: false, message: 'Task not found.' });
            return;
        }
        res.status(200).json({ success: true, message: 'Task deleted.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteTask = deleteTask;
