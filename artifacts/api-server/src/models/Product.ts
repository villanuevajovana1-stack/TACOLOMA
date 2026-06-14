import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  active: { type: Boolean, default: true },
});

export const Product = mongoose.model("Product", productSchema);
