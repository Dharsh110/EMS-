"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const timesheetController_1 = require("../controllers/timesheetController");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
// Employee
router.post('/', timesheetController_1.saveDraft);
router.get('/my', timesheetController_1.getMyTimesheets);
router.put('/:id/submit', timesheetController_1.submitTimesheet);
router.put('/:id/resubmit', timesheetController_1.resubmitTimesheet);
// Manager / Admin
router.get('/', (0, auth_1.authorize)('admin', 'manager'), timesheetController_1.getAllTimesheets);
router.get('/summary', (0, auth_1.authorize)('admin', 'manager'), timesheetController_1.getTimesheetSummary);
router.put('/:id/approve', (0, auth_1.authorize)('admin', 'manager'), timesheetController_1.approveTimesheet);
router.put('/:id/reject', (0, auth_1.authorize)('admin', 'manager'), timesheetController_1.rejectTimesheet);
exports.default = router;
