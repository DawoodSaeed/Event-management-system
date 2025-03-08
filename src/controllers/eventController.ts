import { Request, Response } from "express";
import Event from "../models/Event";
import logger from "../utils/logger";
import { isValidObjectId } from "../utils/helpers";

const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, location, date } = req.body;

    const newEvent = new Event({
      title,
      description,
      location,
      date,
      createdBy: (req as any).user._id,
    });

    const savedEvent = await newEvent.save();
    logger.info(`Event created: ${savedEvent.title}`);

    res.status(201).json(savedEvent);
  } catch (error) {
    logger.error("Error creating event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await Event.find().populate("createdBy", "name email");
    res.json(events);
  } catch (error) {
    logger.error("Error fetching events: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    res.json(event);
  } catch (error) {
    logger.error("Error fetching event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    // Only creator can delete this event ...
    if (event.createdBy.toString() !== (req as any).user._id.toString()) {
      res.status(403).json({ message: "Not authorized to update this event" });
      return;
    }

    event.title = req.body.title || event.title;
    event.description = req.body.description || event.description;
    event.location = req.body.location || event.location;
    event.date = req.body.date || event.date;

    const updatedEvent = await event.save();
    logger.info(`Event updated: ${updatedEvent.title}`);

    res.json(updatedEvent);
  } catch (error) {
    logger.error("Error updating event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.createdBy.toString() !== (req as any).user._id.toString()) {
      res.status(403).json({ message: "Not authorized to delete this event" });
      return;
    }

    await event.deleteOne();
    logger.info(`Event deleted: ${event.title}`);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    logger.error("Error deleting event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN METHODS #######################################
const approveEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid Event ID format" });
      return;
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (!["approved", "rejected"].includes(status)) {
      res
        .status(400)
        .json({ message: "Invalid status. Use 'approved' or 'rejected'" });
      return;
    }

    event.status = status;
    await event.save();

    logger.info(`Admin updated event ${event._id} to status: ${status}`);
    res.json({ message: `Event ${status}` });
  } catch (error) {
    logger.error("Error approving event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin Edit Any Event
const adminEditEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid Event ID format" });
      return;
    }
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    event.title = req.body.title || event.title;
    event.description = req.body.description || event.description;
    event.location = req.body.location || event.location;
    event.date = req.body.date || event.date;

    const updatedEvent = await event.save();
    logger.info(`Admin updated event ${updatedEvent._id}`);

    res.json(updatedEvent);
  } catch (error) {
    logger.error("Error updating event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin Delete Any Event
const adminDeleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid Event ID format" });
      return;
    }

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    await event.deleteOne();
    logger.info(`Admin deleted event ${event._id}`);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    logger.error("Error deleting event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

export {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  approveEvent,
  adminEditEvent,
  adminDeleteEvent,
};
