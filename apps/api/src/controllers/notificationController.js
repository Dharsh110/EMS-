"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.deleteNotification = exports.markAllRead = exports.markAsRead = exports.getMyNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification_1.default.find({ recipient: req.user?._id })
            .sort({ createdAt: -1 }).limit(50);
        const unreadCount = await Notification_1.default.countDocuments({ recipient: req.user?._id, isRead: false });
        res.json({ success: true, data: notifications, unreadCount });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMyNotifications = getMyNotifications;
const markAsRead = async (req, res) => {
    try {
        await Notification_1.default.findOneAndUpdate({ _id: req.params.id, recipient: req.user?._id }, { isRead: true });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.markAsRead = markAsRead;
const markAllRead = async (req, res) => {
    try {
        await Notification_1.default.updateMany({ recipient: req.user?._id, isRead: false }, { isRead: true });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.markAllRead = markAllRead;
const deleteNotification = async (req, res) => {
    try {
        await Notification_1.default.findOneAndDelete({ _id: req.params.id, recipient: req.user?._id });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.deleteNotification = deleteNotification;
// Helper to create a notification (used by other controllers)
const createNotification = async (recipient, role, type, title, message, link, department) => {
    try {
        await Notification_1.default.create({ recipient, recipientRole: role, type, title, message, link, department });
    }
    catch { }
};
exports.createNotification = createNotification;
