"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const update_controller_1 = require("../controllers/update.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/', update_controller_1.getUpdates);
router.post('/', auth_1.authenticate, auth_1.requireAdmin, update_controller_1.createUpdate);
exports.default = router;
