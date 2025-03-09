import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User";
import logger from "../utils/logger";
import sendEmail from "../utils/sendEmail";

dotenv.config();

// Generate JWT Token
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
};

// Generate Verification Token
const generateVerificationToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "1d",
  });
};

// Generate Password Reset Token
const generateResetToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });
};

// User Registration (Sends Verification Email)
const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const user = await User.create({ name, email, password });

    if (user) {
      logger.info(`User registered: ${user.email}`);

      const verificationToken = generateVerificationToken(user.id);
      const verificationLink = `http://localhost:5000/api/users/verify-email/${verificationToken}`;

      const emailSubject = "Verify Your Email";
      const emailText = `Click the link to verify your email: ${verificationLink}`;
      const emailHtml = `<p>Hello <b>${user.name}</b>,</p><p>Please <a href="${verificationLink}">click here</a> to verify your email.</p>`;

      await sendEmail(user.email, emailSubject, emailText, emailHtml);

      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        message:
          "User registered successfully. Check your email to verify your account.",
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    logger.error("Error in user registration: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify Email
const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(400).json({ message: "Invalid verification link" });
      return;
    }

    user.emailVerified = true;
    await user.save();

    logger.info(`User verified email: ${user.email}`);
    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    logger.error("Error verifying email: " + error);
    res.status(500).json({ message: "Invalid or expired token" });
  }
};

// User Login
const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    if (!user.emailVerified) {
      res
        .status(403)
        .json({ message: "Email not verified. Please check your email." });
      return;
    }

    logger.info(`User logged in: ${user.email}`);
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } catch (error) {
    logger.error("Error in user login: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get User Profile (Protected Route)
const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById((req as any).user._id);

    if (user) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    logger.error("Error fetching user profile: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update User Profile
const updateUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById((req as any).user._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (req.body.name) {
      user.name = req.body.name;
    }

    if (req.body.email) {
      user.email = req.body.email;
    }

    if (req.body.oldPassword && req.body.newPassword) {
      const isMatch = await user.comparePassword(req.body.oldPassword);
      if (!isMatch) {
        res.status(400).json({ message: "Old password is incorrect" });
        return;
      }
      user.password = req.body.newPassword;
    }

    const updatedUser = await user.save();
    logger.info(`User profile updated: ${updatedUser.email}`);

    res.json({
      _id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
    });
  } catch (error) {
    logger.error("Error updating user profile: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot Password
const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const resetToken = generateResetToken(user.id);
    const resetLink = `http://localhost:5000/api/users/reset-password/${resetToken}`;

    const emailSubject = "Password Reset Request";
    const emailText = `Click the link to reset your password: ${resetLink}`;
    const emailHtml = `<p>Hello <b>${user.name}</b>,</p><p><a href="${resetLink}">Click here</a> to reset your password.</p>`;

    await sendEmail(user.email, emailSubject, emailText, emailHtml);

    logger.info(`Password reset link sent to: ${user.email}`);
    res.json({ message: "Password reset email sent. Check your inbox." });
  } catch (error) {
    logger.error("Error sending password reset email: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset Password
const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(400).json({ message: "Invalid or expired token" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    logger.info(`User reset password: ${user.email}`);
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    logger.error("Error resetting password: " + error);
    res.status(500).json({ message: "Invalid or expired token" });
  }
};

const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const user = await User.findById(decoded.id).select("-password"); // Exclude password

    if (!user) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select("-password"); // Exclude passwords
    res.json({ users });
  } catch (error) {
    logger.error("Error fetching users: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

export {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  verifyEmail,
  forgotPassword,
  resetPassword,
  verifyToken,
  getAllUsers,
};
