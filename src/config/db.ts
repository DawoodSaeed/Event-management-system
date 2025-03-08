import mongoose from "mongoose";
import logger from "../utils/logger";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info("MongoDB Connected Successfully");
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
