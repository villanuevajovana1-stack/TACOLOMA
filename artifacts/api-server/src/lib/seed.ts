import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { nextSeq } from "../models/Counter";
import { logger } from "./logger";

export async function seedAdmin() {
  try {
    // Seed admin user
    const existingUser = await User.findOne({ username: "admin" });
    const passwordHash = await bcrypt.hash("admin123", 10);

    if (!existingUser) {
      const id = await nextSeq("users");
      await User.create({ id, username: "admin", passwordHash, name: "Administrador", role: "admin" });
      logger.info("Default admin user created (username: admin, password: admin123)");
    } else {
      await User.findOneAndUpdate({ username: "admin" }, { passwordHash });
      logger.info("Admin password reset to admin123");
    }

    // Seed Birria por Kilo product
    const existingProduct = await Product.findOne({ name: "Birria por Kilo" });
    if (!existingProduct) {
      const id = await nextSeq("products");
      await Product.create({ id, name: "Birria por Kilo", price: 500, active: true });
      logger.info("Birria por Kilo seeded successfully (price: 500)");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed default database items");
  }
}
