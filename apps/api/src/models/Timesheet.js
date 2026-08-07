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
// Explicit sub-schema (not an inline object literal) — a field named `type` would
// otherwise be misread by Mongoose as the SchemaTypeOptions `type` key. No `type`
// field here, but keeping the same defensive pattern used by Task/DailyReport/CalendarEvent.
const TimesheetEntrySchema = new mongoose_1.Schema({
    task: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    timeSpentMinutes: { type: Number, required: true, min: 1 },
    remarks: { type: String, trim: true },
}, { _id: false });
const TimesheetAuditEntrySchema = new mongoose_1.Schema({
    action: { type: String, enum: ['created', 'updated', 'submitted', 'approved', 'rejected', 'resubmitted'], required: true },
    by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
    note: { type: String },
}, { _id: false });
const TimesheetSchema = new mongoose_1.Schema({
    employee: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    entries: [TimesheetEntrySchema],
    totalMinutes: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'rejected'],
        default: 'draft',
    },
    submittedAt: { type: Date },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    auditTrail: [TimesheetAuditEntrySchema],
}, { timestamps: true });
TimesheetSchema.pre('save', function (next) {
    if (this.isModified('entries')) {
        this.totalMinutes = this.entries.reduce((sum, e) => sum + (e.timeSpentMinutes || 0), 0);
    }
    next();
});
// One timesheet per employee per day — multiple task entries live inside it (spec 3.1).
TimesheetSchema.index({ employee: 1, date: 1 }, { unique: true });
TimesheetSchema.index({ status: 1, date: -1 });
exports.default = mongoose_1.default.model('Timesheet', TimesheetSchema);
