import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";
import logger from "./utils/logger";
import userRoutes from "./routes/userRoutes";
import eventRoutes from "./routes/eventRoutes";
import participantRoutes from "./routes/participantRoutes";
import invitationRoutes from "./routes/invitationRoutes";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/invitations", invitationRoutes);

const PORT = process.env.PORT || 5000;
connectDB();
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
