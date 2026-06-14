import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const { username, password } = parsed.data;

  const user = await User.findOne({ username });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  res.json({
    id: req.user!.userId,
    username: req.user!.username,
    name: req.user!.name,
    role: req.user!.role,
  });
});

export default router;
