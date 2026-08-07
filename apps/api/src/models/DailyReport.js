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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const DailyReportCommentSchema = new mongoose_1.Schema({
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, default: '' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
// NOTE: explicit sub-schema (not an inline object literal) — a field named
// `type` inside an inline array-of-objects definition gets misread by
// Mongoose as the SchemaTypeOptions `type` key, silently collapsing the
// whole array into an array of strings.
const DailyReportFileSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    type: { type: String, default: '' },
    url: { type: String },
    uploadId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Upload' },
}, { _id: false });
const DailyReportSchema = new mongoose_1.Schema({
    employee: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    empCode: { type: String, required: true },
    empName: { type: String, required: true },
    department: { type: String, required: true },
    date: { type: String, required: true },
    taskTitle: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    achievements: { type: String, trim: true },
    challenges: { type: String, trim: true },
    nextPlan: { type: String, trim: true },
    mood: { type: String, enum: ['great', 'good', 'neutral', 'tired', 'stressed'], default: 'good' },
    hoursWorked: { type: Number, required: true, min: 0, max: 24 },
    status: { type: String, enum: ['in_progress', 'completed', 'blocked', 'pending_review'], default: 'in_progress' },
    recipients: [{ type: String, enum: ['manager', 'admin', 'team'] }],
    link: { type: String },
    files: [DailyReportFileSchema],
    comments: [DailyReportCommentSchema],
    submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });
DailyReportSchema.index({ employee: 1, date: 1 });
DailyReportSchema.index({ department: 1, date: 1 });
DailyReportSchema.index({ date: -1 });
exports.default = mongoose_1.default.model('DailyReport', DailyReportSchema);
