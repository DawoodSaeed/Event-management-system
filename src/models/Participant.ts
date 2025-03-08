import mongoose, { Schema, Document } from "mongoose";

export interface IParticipant extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  invitationStatus: "pending" | "accepted" | "declined";
  joinedAt: Date;
}

const ParticipantSchema: Schema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    invitationStatus: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: { createdAt: "joinedAt" } }
);

export default mongoose.model<IParticipant>("Participant", ParticipantSchema);
