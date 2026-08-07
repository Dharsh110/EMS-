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
const PayrollSchema = new mongoose_1.Schema({
    employee: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    basicSalary: { type: Number, required: true },
    allowances: {
        hra: { type: Number, default: 0 },
        transport: { type: Number, default: 0 },
        medical: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
    },
    deductions: {
        pf: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
    },
    totalAllowances: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    workingDays: { type: Number, default: 26 },
    presentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'processed', 'paid', 'failed'], default: 'pending' },
    processedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
    paidAt: { type: Date },
    remarks: { type: String },
}, { timestamps: true });
PayrollSchema.pre('save', function (next) {
    this.totalAllowances =
        this.allowances.hra + this.allowances.transport + this.allowances.medical + this.allowances.other;
    this.totalDeductions = this.deductions.pf + this.deductions.tax + this.deductions.other;
    this.grossSalary = this.basicSalary + this.totalAllowances + this.overtimePay;
    this.netSalary = this.grossSalary - this.totalDeductions;
    next();
});
PayrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
exports.default = mongoose_1.default.model('Payroll', PayrollSchema);
