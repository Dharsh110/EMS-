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
const AttendanceSchema = new mongoose_1.Schema({
    employee: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    totalHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['present', 'absent', 'leave', 'half_day', 'holiday', 'weekend'],
        default: 'absent',
    },
    isLate: { type: Boolean, default: false },
    lateByMinutes: { type: Number, default: 0 },
    notes: { type: String },
    markedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
AttendanceSchema.pre('save', function (next) {
    if (this.checkIn && this.checkOut) {
        const diffMs = this.checkOut.getTime() - this.checkIn.getTime();
        this.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        const standardHours = 9;
        if (this.totalHours > standardHours) {
            this.overtimeHours = parseFloat((this.totalHours - standardHours).toFixed(2));
        }
    }
    if (this.checkIn) {
        const checkInHour = this.checkIn.getHours();
        const checkInMin = this.checkIn.getMinutes();
        const totalMinutes = checkInHour * 60 + checkInMin;
        const startTime = 9 * 60 + 15; // 9:15 AM threshold
        if (totalMinutes > startTime) {
            this.isLate = true;
            this.lateByMinutes = totalMinutes - 9 * 60;
        }
    }
    next();
});
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1, status: 1 });
exports.default = mongoose_1.default.model('Attendance', AttendanceSchema);
