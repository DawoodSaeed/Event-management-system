import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

interface AdminRequest extends Request {
  user?: any;
}

const isAdmin = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    logger.warn(
      `Unauthorized admin action attempted by user: ${req.user?._id}`
    );
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

export { isAdmin };
