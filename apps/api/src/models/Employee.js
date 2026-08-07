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
const EmployeeSchema = new mongoose_1.Schema({
    employeeCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        required: false,
        default: '',
        trim: true,
    },
    department: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Department',
        required: false,
        default: null,
    },
    designation: {
        type: String,
        required: true,
        trim: true,
    },
    reportingTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    joiningDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    salary: {
        type: Number,
        default: 0,
    },
    avatar: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_leave'],
        default: 'active',
    },
    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'intern'],
        default: 'full_time',
    },
    workLocation: {
        type: String,
        default: 'HQ',
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
    },
    emergencyContact: {
        name: String,
        phone: String,
        relation: String,
    },
    bankDetails: {
        accountNumber: String,
        ifscCode: String,
        bankName: String,
    },
    gender: { type: String, default: '' },
    dateOfBirth: { type: Date },
    bloodGroup: { type: String, default: '' },
    bio: { type: String, default: '' },
    skills: [{ type: String }],
    preferences: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
    toObject: {
        virtuals: true,
    },
});
EmployeeSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
// Only keep indexes that are NOT already created by `unique: true`
EmployeeSchema.index({ department: 1, status: 1 });
exports.default = mongoose_1.default.model('Employee', EmployeeSchema);
