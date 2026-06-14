import mongoose from "mongoose";
import { logger } from "./logger";

export async function connectMongo() {
  const uri = process.env["MONGODB_URI"];
  if (!uri) throw new Error("MONGODB_URI environment variable is required");
  await mongoose.connect(uri);
  logger.info("Connected to MongoDB");
}
