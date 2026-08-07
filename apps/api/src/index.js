"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = __importDefault(require("./config/database"));
const index_1 = __importDefault(require("./routes/index"));
const calendarReminders_1 = require("./jobs/calendarReminders");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
(0, database_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
const limiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests, please try again later.' });
app.use('/api', limiter);
app.use('/api/v1', index_1.default);
app.get('/api/v1/health', (_req, res) => {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbStatus = dbState[mongoose_1.default.connection.readyState] || 'unknown';
    res.status(200).json({
        success: true,
        message: 'ZetaQ EMS API is running',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        dbConnected: mongoose_1.default.connection.readyState === 1,
    });
});
app.use('*', (_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal server error.' });
});
app.listen(PORT, () => {
    console.log(`🚀 ZetaQ EMS Server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV}`);
    (0, calendarReminders_1.startCalendarReminderJob)();
});
exports.default = app;
