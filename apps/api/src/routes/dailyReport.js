"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const dailyReportController_1 = require("../controllers/dailyReportController");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.post('/', dailyReportController_1.createReport);
router.get('/mine', dailyReportController_1.getMyReports);
router.get('/', (0, auth_1.authorize)('admin', 'manager'), dailyReportController_1.getAllReports); // admin/manager: all reports with optional filters
router.put('/:id', dailyReportController_1.updateReport);
router.delete('/:id', dailyReportController_1.deleteReport);
router.post('/:id/comments', (0, auth_1.authorize)('admin', 'manager'), dailyReportController_1.addReportComment);
exports.default = router;
