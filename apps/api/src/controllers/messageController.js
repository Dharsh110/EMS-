"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.markRead = exports.getMessages = exports.sendMessage = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const Employee_1 = __importDefault(require("../models/Employee"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("./notificationController");
const sendMessage = async (req, res) => {
    try {
        const { title, description, priority, recipients, link, fileName, department } = req.body;
        // Resolve the sender's department from their Employee record if not provided
        let senderDept = department || '';
        if (!senderDept && req.user?.role === 'employee') {
            try {
                const emp = await Employee_1.default.findOne({ user: req.user._id }).populate('department', 'name');
                senderDept = emp?.department?.name || '';
            }
            catch { }
        }
        if (!senderDept && req.user?.role === 'manager') {
            senderDept = req.user.department || '';
        }
        const recipientList = recipients || ['manager'];
        const msg = await Message_1.default.create({
            sender: req.user?._id,
            senderName: req.user?.name || '',
            senderRole: req.user?.role || 'employee',
            department: senderDept,
            title,
            description,
            priority: priority || 'normal',
            recipients: recipientList,
            link,
            fileName,
        });
        try {
            const notifyUsers = [];
            if (recipientList.includes('admin')) {
                notifyUsers.push(...(await User_1.default.find({ role: 'admin' }).select('_id role')));
            }
            if (recipientList.includes('manager')) {
                // "Manager" targets ONLY the main/unscoped manager(s) — distinct from
                // "Dept Manager" below, which targets only the sender's own dept manager.
                notifyUsers.push(...(await User_1.default.find({
                    role: 'manager',
                    $or: [{ department: '' }, { department: { $exists: false } }, { department: null }],
                }).select('_id role')));
            }
            if (recipientList.includes('deptManager') && senderDept) {
                notifyUsers.push(...(await User_1.default.find({ role: 'manager', department: senderDept }).select('_id role')));
            }
            if (recipientList.includes('team') && senderDept) {
                const deptUsers = await User_1.default.find({ role: 'employee', department: senderDept }).select('_id role');
                notifyUsers.push(...deptUsers);
            }
            for (const u of notifyUsers) {
                if (u._id.toString() === req.user?._id?.toString())
                    continue;
                await (0, notificationController_1.createNotification)(u._id.toString(), u.role, 'message', title || 'New message', description || `New message from ${req.user?.name}`, `/${u.role}/messages`, senderDept || undefined);
            }
        }
        catch { /* notification failure should not block message send */ }
        res.status(201).json({ success: true, message: msg });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.sendMessage = sendMessage;
const getMessages = async (req, res) => {
    try {
        const role = req.user?.role;
        const { type = 'sent' } = req.query; // 'sent' | 'inbox'
        if (role === 'employee') {
            if (type === 'inbox') {
                // Employee inbox: messages from managers/admin sent to 'team' in their dept
                let empDept = '';
                try {
                    const emp = await Employee_1.default.findOne({ user: req.user?._id }).populate('department', 'name');
                    empDept = emp?.department?.name || '';
                }
                catch { }
                const filter = {
                    senderRole: { $in: ['manager', 'admin'] },
                    recipients: 'team',
                };
                if (empDept)
                    filter.department = empDept;
                const messages = await Message_1.default.find(filter).sort({ createdAt: -1 }).limit(100);
                res.json({ success: true, messages });
            }
            else {
                // Employee outbox: messages they sent
                const messages = await Message_1.default.find({ sender: req.user?._id }).sort({ createdAt: -1 }).limit(100);
                res.json({ success: true, messages });
            }
            return;
        }
        if (role === 'manager') {
            const dept = req.user?.department;
            if (type === 'inbox') {
                // Manager inbox: a dept-scoped manager sees only messages from their own
                // dept's employees specifically targeted at 'deptManager'. The main/unscoped
                // manager sees only 'manager'-targeted messages (from any employee, plus
                // dept managers escalating to them) — never someone else's dept-manager-only
                // message. These are mutually exclusive on purpose (see Phase 3 of the plan).
                const filter = dept
                    ? { senderRole: 'employee', department: dept, recipients: 'deptManager' }
                    : { senderRole: { $in: ['employee', 'manager'] }, recipients: 'manager' };
                const messages = await Message_1.default.find(filter).sort({ createdAt: -1 }).limit(100);
                res.json({ success: true, messages });
            }
            else {
                // Manager outbox: messages they sent
                const messages = await Message_1.default.find({ sender: req.user?._id }).sort({ createdAt: -1 }).limit(100);
                res.json({ success: true, messages });
            }
            return;
        }
        // Admin
        if (type === 'inbox') {
            // Admin inbox: messages sent TO admin by employees/managers
            const messages = await Message_1.default.find({ recipients: 'admin' }).sort({ createdAt: -1 }).limit(200);
            res.json({ success: true, messages });
        }
        else {
            // Admin outbox: messages sent by admin
            const messages = await Message_1.default.find({ sender: req.user?._id }).sort({ createdAt: -1 }).limit(200);
            res.json({ success: true, messages });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMessages = getMessages;
const markRead = async (req, res) => {
    try {
        const msg = await Message_1.default.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user?._id }, status: 'read' }, { new: true });
        if (!msg) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }
        res.json({ success: true, message: msg });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.markRead = markRead;
const deleteMessage = async (req, res) => {
    try {
        const msg = await Message_1.default.findOneAndDelete({ _id: req.params.id, sender: req.user?._id });
        if (!msg) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }
        res.json({ success: true, message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.deleteMessage = deleteMessage;
