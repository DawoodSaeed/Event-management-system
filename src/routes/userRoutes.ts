import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  verifyEmail,
  resetPassword,
  forgotPassword,
  verifyToken,
  getAllUsers,
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email/:token", verifyEmail);

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/verify-token", protect, verifyToken);

router.get("/all", protect, getAllUsers);

export default router;
