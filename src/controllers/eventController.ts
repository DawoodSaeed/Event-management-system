import { Request, Response } from "express";
import Event from "../models/Event";
import logger from "../utils/logger";
import { isValidObjectId } from "../utils/helpers";
import Participant from "../models/Participant";
import sendEmail from "../utils/sendEmail";
import { SortOrder } from "mongoose";

const getUserEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    if (!isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid User ID format" });
      return;
    }

    const { title, location, description, startDate, endDate, sort } =
      req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter: any = { createdBy: userId };

    if (title) filter.title = { $regex: title, $options: "i" };
    if (location) filter.location = { $regex: location, $options: "i" };
    if (description)
      filter.description = { $regex: description, $options: "i" };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    // Sorting logic
    const sortOrder: { [key: string]: SortOrder } =
      sort === "oldest" ? { date: 1 } : { date: -1 };

    const totalEvents = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    res.json({
      events,
      totalPages: Math.ceil(totalEvents / limit),
      currentPage: page,
    });
  } catch (error) {
    logger.error("Error fetching user events: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, location, date, participants } = req.body;
    const userId = (req as any).user._id;

    const event = await Event.create({
      title,
      description,
      location,
      date,
      createdBy: userId,
      status: "pending",
    });

    // Store participants separately
    if (participants && participants.length > 0) {
      for (const participantId of participants) {
        await Participant.create({ eventId: event._id, userId: participantId });
      }
    }

    res.status(201).json({ message: "Event created successfully", event });
  } catch (error) {
    logger.error("Error creating event: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Events with Search, Filtering & Pagination
const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, location, status, startDate, endDate, page, limit } =
      req.query;
    const userId = (req as any).user._id; // Logged-in user

    const query: any = {};

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by location
    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    // Filter by event status
    if (status) {
      query.status = status;
    }

    // Filter by event date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    // Pagination setup
    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 5;
    const skip = (pageNumber - 1) * pageSize;

    const events = await Event.find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ date: 1 })
      .lean();

    if (!events || events.length === 0) {
      res.json({
        totalPages: 0,
        total: 0,
        page: pageNumber,
        pageSize,
        events: [],
      });
      return;
    }

    const joinedEventIds = new Set(
      (
        await Participant.find({
          userId,
          invitationStatus: "accepted",
        }).distinct("eventId")
      ).map((id) => id.toString())
    );

    const updatedEvents = events
      .map((event) => {
        if (!event._id) {
          console.warn("Warning: Event missing _id", event); // Log for debugging
          return null; // Skip events without _id
        }

        return {
          ...event,
          _id: event._id.toString(),
          hasJoined: joinedEventIds.has(event._id.toString()),
        };
      })
      .filter(Boolean);

    const totalEvents = await Event.countDocuments(query);

    res.json({
      totalPages: Math.ceil(totalEvents / pageSize),
      total: totalEvents,
      page: pageNumber,
      pageSize: pageSize,
      events: updatedEvents,
    });
  } catch (error) {
    console.error(" Error fetching events:", error);
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
    const { title, description, location, date } = req.body;
    const event = await Event.findOne({
      _id: req.params.id,
      createdBy: (req as any).user._id,
    });

    if (!event) {
      res.status(404).json({ message: "Event not found or not owned by user" });
      return;
    }

    event.title = title || event.title;
    event.description = description || event.description;
    event.location = location || event.location;
    event.date = date || event.date;

    await event.save();
    res.json({ message: "Event updated successfully", event });
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
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.status === "approved") {
      res.status(400).json({ message: "Event is already approved" });
      return;
    }

    event.status = "approved";
    await event.save();

    // Fetch participants
    const participants = await Participant.find({
      eventId: event._id,
    }).populate("userId", "email name");

    const participantEmails = participants.map((p: any) => p.userId.email);

    const subject = `Your Invitation to ${event.title}`;
    const message = `You have been invited to the event: ${event.title} on ${event.date}. Location: ${event.location}`;

    for (const email of participantEmails) {
      await sendEmail(email, subject, message);
    }

    res.json({ message: "Event approved and invitations sent" });
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

const getPendingEventsForAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const totalPendingEvents = await Event.countDocuments({
      status: "pending",
    });

    const pendingEvents = await Event.find({ status: "pending" })
      .skip(skip)
      .limit(limit)
      .sort({ date: 1 })
      .lean();

    res.json({
      totalPages: Math.ceil(totalPendingEvents / limit),
      total: totalPendingEvents,
      page,
      pageSize: limit,
      events: pendingEvents,
    });
  } catch (error) {
    logger.error("Error fetching pending events: " + error);
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
  getUserEvents,
  getPendingEventsForAdmin,
};
