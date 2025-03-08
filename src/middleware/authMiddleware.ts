import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import logger from "../utils/logger";
import User from "../models/User";

dotenv.config();

interface AuthRequest extends Request {
  user?: any;
}

const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    logger.error("Unauthorized access: No token provided");
    res.status(401).json({ message: "Not authorized, no token" });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    next();
  } catch (error) {
    logger.error("Unauthorized access: Invalid token");
    res.status(401).json({ message: "Not authorized, invalid token" });
    return;
  }
};

export { protect };
