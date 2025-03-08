import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  verifyEmail,
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email/:token", verifyEmail);

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

export default router;
