import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  productId: { type: Number, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  notes: { type: String, default: "" },
});

const orderSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  clientName: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "delivered", "billing", "paid"],
    default: "pending",
  },
  waiterId: { type: Number, required: true },
  waiterName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  items: [orderItemSchema],
});

export const Order = mongoose.model("Order", orderSchema);
