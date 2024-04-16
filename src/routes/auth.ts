import { isAdmin } from "./../middleware/authorization";
import express from "express";
const router = express.Router();

import AuthController from "../controllers/auth";
import { verifyAccessToken } from "../middleware/jwtServices";

router.use(verifyAccessToken, isAdmin);
router.get("/", AuthController.readUsers);
router.post("/", AuthController.createUser);
router.delete("/:id", AuthController.deleteUser);

export default router;
