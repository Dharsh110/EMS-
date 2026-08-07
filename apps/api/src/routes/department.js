"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const departmentController_1 = require("../controllers/departmentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', departmentController_1.getAllDepartments); // public — needed for signup dept dropdown
router.post('/', auth_1.protect, (0, auth_1.authorize)('admin'), departmentController_1.createDepartment);
router.put('/:id', auth_1.protect, (0, auth_1.authorize)('admin'), departmentController_1.updateDepartment);
router.delete('/:id', auth_1.protect, (0, auth_1.authorize)('admin'), departmentController_1.deleteDepartment);
exports.default = router;
