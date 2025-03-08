import mongoose from "mongoose";

const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

export { isValidObjectId };
