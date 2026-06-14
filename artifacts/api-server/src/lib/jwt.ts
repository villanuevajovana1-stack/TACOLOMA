import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET ?? "tacos-loma-secret";

export interface JwtPayload {
  userId: number;
  username: string;
  name: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
