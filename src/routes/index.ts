import express from "express";
import UserRouter from "./user";
import AuthRouter from "./auth";
import { notFound } from "../middleware/notFound";

const router = express.Router();

router.use("/user", UserRouter);
router.use("/auth", AuthRouter);

router.use(notFound);

export default router;
