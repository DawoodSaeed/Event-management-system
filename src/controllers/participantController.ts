import { Request, Response } from "express";
import Participant from "../models/Participant";
import Event from "../models/Event";
import logger from "../utils/logger";
import { isValidObjectId } from "../utils/helpers";
import sendEmail from "../utils/sendEmail";
import User from "../models/User";

const joinEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.body;
    const userId = (req as any).user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (new Date(event.date) < new Date()) {
      res.status(400).json({ message: "You cannot join past events" });
      return;
    }

    const existingParticipant = await Participant.findOne({ eventId, userId });
    if (existingParticipant) {
      res.status(400).json({ message: "You have already joined this event" });
      return;
    }

    await Participant.create({ eventId, userId, invitationStatus: "accepted" });

    res.json({ message: "Successfully joined the event" });
  } catch (error) {
    logger.error("Error joining event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const getParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const participants = await Participant.find({ eventId }).populate(
      "userId",
      "name email"
    );
    res.json(participants);
  } catch (error) {
    logger.error("Error fetching participants: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const leaveEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userId = (req as any).user._id;

    const participant = await Participant.findOne({ eventId, userId });
    if (!participant) {
      res
        .status(400)
        .json({ message: "You are not a participant in this event" });
      return;
    }

    await participant.deleteOne();
    logger.info(`User ${userId} left event ${eventId}`);

    res.json({ message: "Successfully left event" });
  } catch (error) {
    logger.error("Error leaving event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send Invitation
const sendInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, userId } = req.body;
    const senderId = (req as any).user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.createdBy.toString() !== senderId) {
      res
        .status(403)
        .json({ message: "Only event creators can send invitations" });
      return;
    }

    const existingParticipant = await Participant.findOne({ eventId, userId });
    if (existingParticipant) {
      res.status(400).json({ message: "User already invited" });
      return;
    }

    await Participant.create({ eventId, userId, invitationStatus: "pending" });

    const recipient = await User.findById(userId);
    if (event.status === "approved" && recipient) {
      const subject = `You're invited to ${event.title}`;
      const message = `You have been invited to the event: ${event.title}. Location: ${event.location}. Date: ${event.date}`;
      await sendEmail(recipient.email, subject, message);
    }

    res.json({ message: "Invitation sent successfully" });
  } catch (error) {
    logger.error("Error sending invitation: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Fetch User's Invitations
const getMyInvitations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const currentDate = new Date();

    const invitations = await Participant.find({
      userId,
      invitationStatus: "pending",
    }).populate({
      path: "eventId",
      match: { date: { $gte: currentDate } },
      select: "title location date",
    });

    const filteredInvitations = invitations.filter(
      (inv) => inv.eventId !== null
    );

    res.json({ invitations: filteredInvitations });
  } catch (error) {
    logger.error("Error fetching invitations: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const acceptInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.body;
    const userId = (req as any).user._id;

    const invitation = await Participant.findOne({
      _id: invitationId,
      userId,
    }).populate<{ eventId: Event }>("eventId");

    if (!invitation) {
      res.status(404).json({ message: "Invitation not found" });
      return;
    }

    if (invitation.invitationStatus === "accepted") {
      res.status(400).json({ message: "You have already joined this event" });
      return;
    }

    const event = invitation.eventId as unknown as { date: string };

    if (!event || !event.date) {
      res.status(400).json({ message: "This event no longer exists" });
      return;
    }

    if (new Date(event.date) < new Date()) {
      res.status(400).json({ message: "Cannot join past events" });
      return;
    }

    invitation.invitationStatus = "accepted";
    await invitation.save();

    res.json({ message: "Successfully joined the event" });
  } catch (error) {
    logger.error("Error accepting invitation: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const declineInvitation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.body;
    const userId = (req as any).user._id;

    const invitation = await Participant.findOne({ _id: invitationId, userId });
    if (!invitation) {
      res.status(404).json({ message: "Invitation not found" });
      return;
    }

    if (invitation.invitationStatus === "declined") {
      res
        .status(400)
        .json({ message: "You have already declined this invitation" });
      return;
    }

    // Update status to declined
    invitation.invitationStatus = "declined";
    await invitation.save();

    res.json({ message: "Invitation declined successfully" });
  } catch (error) {
    logger.error("Error declining invitation: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const getJoinedEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    const joinedEvents = await Participant.find({
      userId,
      invitationStatus: "accepted",
    }).populate("eventId", "title location date");

    res.json({ joinedEvents });
  } catch (error) {
    logger.error("Error fetching joined events: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

export {
  joinEvent,
  getParticipants,
  leaveEvent,
  sendInvitation,
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  getJoinedEvents,
};
