import express from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  approveEvent,
  adminEditEvent,
  adminDeleteEvent,
  getUserEvents,
} from "../controllers/eventController";

// Middlewares....
import { protect } from "../middleware/authMiddleware";
import { isAdmin } from "../middleware/adminMiddleware";

const router = express.Router();
router.get("/my-events", protect, getUserEvents);

// unprotected routes ###########
router.get("/", getEvents);
router.get("/:id", getEventById);

// ptotected routes/..,.
router.post("/", protect, createEvent);
router.put("/:id", protect, updateEvent);
router.delete("/:id", protect, deleteEvent);

// Admin Routes
router.put("/:id/approve", protect, isAdmin, approveEvent); // Admin approves/rejects event
router.put("/:id/admin-edit", protect, isAdmin, adminEditEvent); // Admin edits event
router.delete("/:id/admin-delete", protect, isAdmin, adminDeleteEvent); // Admin deletes event

export default router;
