import express from "express";
import {
  inviteUser,
  respondToInvitation,
  getUserInvitations,
} from "../controllers/invitationController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/invite", protect, inviteUser); 
router.put("/respond", protect, respondToInvitation); //Can be accepted or decline
router.get("/my-invitations", protect, getUserInvitations);

export default router;
