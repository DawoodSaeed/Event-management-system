import { Request, Response } from "express";
import Participant from "../models/Participant";
import Event from "../models/Event";
import logger from "../utils/logger";
import { isValidObjectId } from "../utils/helpers";

const joinEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.body;
    const userId = (req as any).user._id;

    if (!isValidObjectId(eventId)) {
      res.status(400).json({ message: "Event not correct format" });
      return;
    }

    const event = await Event.findById(eventId);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const existingParticipant = await Participant.findOne({ eventId, userId });
    if (existingParticipant) {
      res.status(400).json({ message: "Already joined this event" });
      return;
    }

    const participant = new Participant({
      eventId,
      userId,
      invitationStatus: "accepted",
    });
    await participant.save();

    logger.info(`User ${userId} joined event ${eventId}`);
    res.status(201).json({ message: "Successfully joined event" });
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

export { joinEvent, getParticipants, leaveEvent };
