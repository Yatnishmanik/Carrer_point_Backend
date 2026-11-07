"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const practice_controller_1 = require("../controllers/practice.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/', practice_controller_1.getPracticeSets);
router.post('/', auth_1.authenticate, auth_1.requireAdmin, practice_controller_1.createPracticeSet);
exports.default = router;
