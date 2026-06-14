import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "waiter", "cashier"], required: true },
});

export const User = mongoose.model("User", userSchema);
