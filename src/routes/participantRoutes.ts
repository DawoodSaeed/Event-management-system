import express from "express";
import {
  joinEvent,
  getParticipants,
  leaveEvent,
} from "../controllers/participantController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/:eventId", getParticipants);

// protected routes....
router.post("/join", protect, joinEvent);
router.delete("/:eventId/leave", protect, leaveEvent);

export default router;
