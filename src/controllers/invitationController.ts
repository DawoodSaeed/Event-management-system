import { Request, Response } from "express";
import mongoose, { isValidObjectId } from "mongoose";
import Participant from "../models/Participant";
import Event from "../models/Event";
import User from "../models/User";
import logger from "../utils/logger";
import sendEmail from "../utils/sendEmail";

// Invite User to Event
const inviteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, userId } = req.body;

    if (!isValidObjectId(eventId) || !isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid Event ID or User ID format" });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const existingParticipant = await Participant.findOne({ eventId, userId });
    if (existingParticipant) {
      res.status(400).json({ message: "User already invited or joined" });
      return;
    }

    const invitation = new Participant({
      eventId,
      userId,
      invitationStatus: "pending",
    });
    await invitation.save();

    logger.info(`User ${userId} invited to event ${eventId}`);

    // Nodemailer stuff ##################
    const emailSubject = `You're Invited to ${event.title}`;
    const emailText = `Hello ${user.name},\n\nYou have been invited to the event "${event.title}" happening on ${event.date} at ${event.location}.\n\nPlease log in to accept or decline the invitation.`;
    const emailHtml = `<p>Hello <b>${user.name}</b>,</p><p>You have been invited to the event "<b>${event.title}</b>" happening on <b>${event.date}</b> at <b>${event.location}</b>.</p><p><a href="http://localhost:4200/invitations">Click here</a> to accept or decline.</p>`;

    await sendEmail(user.email, emailSubject, emailText, emailHtml);

    res.status(201).json({ message: "User invited successfully. Email sent." });
  } catch (error) {
    logger.error("Error inviting user: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const respondToInvitation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, status } = req.body;
    const userId = (req as any).user._id;

    if (!isValidObjectId(invitationId)) {
      res.status(400).json({ message: "Invalid Invitation ID format" });
      return;
    }

    const invitation = await Participant.findById(invitationId);
    if (!invitation) {
      res.status(404).json({ message: "Invitation not found" });
      return;
    }

    if (invitation.userId.toString() !== userId.toString()) {
      res
        .status(403)
        .json({ message: "Not authorized to respond to this invitation" });
      return;
    }

    if (!["accepted", "declined"].includes(status)) {
      res
        .status(400)
        .json({ message: "Invalid status. Must be 'accepted' or 'declined'" });
      return;
    }

    invitation.invitationStatus = status;
    await invitation.save();

    logger.info(`User ${userId} responded to invitation: ${status}`);
    res.json({ message: `Invitation ${status}` });
  } catch (error) {
    logger.error("Error responding to invitation: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Invitations for a User
const getUserInvitations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    // Find all invitations for the user
    const invitations = await Participant.find({
      userId,
      invitationStatus: "pending",
    }).populate("eventId", "title description date location");

    res.json(invitations);
  } catch (error) {
    logger.error("Error fetching invitations: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

export { inviteUser, respondToInvitation, getUserInvitations };
