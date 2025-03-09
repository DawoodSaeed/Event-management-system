import express from "express";
import {
  joinEvent,
  getParticipants,
  leaveEvent,
  sendInvitation,
  getMyInvitations,
  declineInvitation,
  acceptInvitation,
  getJoinedEvents,
} from "../controllers/participantController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();
router.get("/my-invitations", protect, getMyInvitations);
router.post("/send-invitation", protect, sendInvitation);
router.post("/join", protect, joinEvent);
router.post("/accept-invitation", protect, acceptInvitation);
router.post("/decline-invitation", protect, declineInvitation);
router.get("/joined-events", protect, getJoinedEvents);

router.get("/:eventId", getParticipants);
router.delete("/:eventId/leave", protect, leaveEvent);

export default router;
