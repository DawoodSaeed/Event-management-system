import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`Error: ${err.message}`);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
};

export default errorHandler;
