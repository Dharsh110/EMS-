"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public self-registration is intentionally not exposed — accounts are provisioned
// by an admin (see POST /employees) and log in with the credentials they're given.
router.post('/login', authController_1.login);
router.post('/forgot-password', authController_1.forgotPassword);
router.put('/reset-password/:token', authController_1.resetPassword);
router.get('/me', auth_1.protect, authController_1.getMe);
router.put('/change-password', auth_1.protect, authController_1.changePassword);
router.post('/logout', auth_1.protect, authController_1.logout);
// Google OAuth temporarily disabled — uncomment to re-enable (frontend sends { googleId, email, name })
// router.post('/google', googleCallback);
exports.default = router;
