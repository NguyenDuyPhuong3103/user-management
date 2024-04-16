import express from "express";
const router = express.Router();

import UserController from "../controllers/user";

import { RequestWithUser, verifyAccessToken } from "../middleware/jwtServices";

router.get("/refreshToken", UserController.refreshToken);
router.get("/logout", verifyAccessToken, UserController.logout);
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.put("/", verifyAccessToken, UserController.updateProfile);
router.patch(
  "/changePassword",
  verifyAccessToken,
  UserController.changePassword
);
router.get("/:id", UserController.readProfile);

export default router;
