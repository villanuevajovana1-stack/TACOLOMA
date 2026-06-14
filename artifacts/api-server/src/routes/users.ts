import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { nextSeq } from "../models/Counter";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateUserBody, UpdateUserBody, UpdateUserParams, DeleteUserParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const users = await User.find().sort({ id: 1 });
  res.json(users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role })));
});

router.post("/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password, name, role } = parsed.data;

  const existing = await User.findOne({ username });
  if (existing) {
    res.status(400).json({ error: "Username already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = await nextSeq("users");
  const user = await User.create({ id, username, passwordHash, name, role });

  res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role });
});

router.put("/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const paramsResult = UpdateUserParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.username) updates.username = parsed.data.username;
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.password) updates.passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await User.findOneAndUpdate({ id: paramsResult.data.id }, updates, { new: true });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
});

router.delete("/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const paramsResult = DeleteUserParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  await User.findOneAndDelete({ id: paramsResult.data.id });
  res.json({ success: true });
});

export default router;
