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
exports.getAllUploads = exports.deleteUpload = exports.updateUpload = exports.getUploadById = exports.getMyUploads = exports.uploadFile = void 0;
const Upload_1 = __importDefault(require("../models/Upload"));
const Employee_1 = __importDefault(require("../models/Employee"));
const getOrCreateEmp = async (userId, userName, userEmail) => {
    let emp = await Employee_1.default.findOne({ user: userId });
    if (!emp) {
        const count = await Employee_1.default.countDocuments();
        const [firstName, ...rest] = (userName || 'User').split(' ');
        emp = await Employee_1.default.create({
            employeeCode: `EMP${String(count + 1).padStart(3, '0')}`,
            user: userId, firstName, lastName: rest.join(' ') || '-',
            email: userEmail || '', designation: 'Employee',
            joiningDate: new Date(), phone: '', workLocation: 'HQ',
        });
    }
    return emp;
};
const uploadFile = async (req, res) => {
    try {
        const { originalName, mimeType, size, data, notes, category } = req.body;
        if (!originalName || !data) {
            res.status(400).json({ success: false, message: 'File name and data are required.' });
            return;
        }
        const emp = await getOrCreateEmp(req.user?._id, req.user?.name, req.user?.email);
        const upload = await Upload_1.default.create({
            employee: emp._id,
            user: req.user?._id,
            employeeCode: emp.employeeCode,
            employeeName: req.user?.name || `${emp.firstName} ${emp.lastName}`,
            originalName,
            mimeType: mimeType || 'application/octet-stream',
            size: size || 0,
            data,
            notes,
            category: category || 'document',
        });
        res.status(201).json({ success: true, data: upload, message: 'File uploaded successfully.' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.uploadFile = uploadFile;
const getMyUploads = async (req, res) => {
    try {
        const uploads = await Upload_1.default.find({ user: req.user?._id })
            .sort({ uploadedAt: -1 })
            .select('-data'); // exclude base64 from list (only load on demand)
        res.json({ success: true, data: uploads });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMyUploads = getMyUploads;
const getUploadById = async (req, res) => {
    try {
        const upload = await Upload_1.default.findOne({ _id: req.params.id, user: req.user?._id });
        if (!upload) {
            res.status(404).json({ success: false, message: 'File not found.' });
            return;
        }
        res.json({ success: true, data: upload });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getUploadById = getUploadById;
const updateUpload = async (req, res) => {
    try {
        const { notes, originalName } = req.body;
        const upload = await Upload_1.default.findOneAndUpdate({ _id: req.params.id, user: req.user?._id }, { notes, originalName }, { new: true }).select('-data');
        if (!upload) {
            res.status(404).json({ success: false, message: 'File not found.' });
            return;
        }
        res.json({ success: true, data: upload });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.updateUpload = updateUpload;
const deleteUpload = async (req, res) => {
    try {
        const upload = await Upload_1.default.findOneAndDelete({ _id: req.params.id, user: req.user?._id });
        if (!upload) {
            res.status(404).json({ success: false, message: 'File not found.' });
            return;
        }
        res.json({ success: true, message: 'File deleted.' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.deleteUpload = deleteUpload;
// Admin/manager: get all uploads (optionally filtered by dept)
const getAllUploads = async (req, res) => {
    try {
        const { employeeCode, category } = req.query;
        const filter = {};
        if (employeeCode)
            filter.employeeCode = employeeCode;
        if (category)
            filter.category = category;
        // Manager dept scoping
        const dept = req.user?.department;
        if (dept && req.user?.role === 'manager') {
            const Employee2 = (await Promise.resolve().then(() => __importStar(require('../models/Employee')))).default;
            const Department = (await Promise.resolve().then(() => __importStar(require('../models/Department')))).default;
            const deptDoc = await Department.findOne({ name: dept });
            if (deptDoc) {
                const emps = await Employee2.find({ department: deptDoc._id }).select('_id');
                filter.employee = { $in: emps.map((e) => e._id) };
            }
        }
        const uploads = await Upload_1.default.find(filter).sort({ uploadedAt: -1 }).select('-data');
        res.json({ success: true, data: uploads });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getAllUploads = getAllUploads;
