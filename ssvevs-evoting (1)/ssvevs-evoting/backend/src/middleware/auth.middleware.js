import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function requireAuth(role) {
  return (req, res, next) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "missing token" });
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      if (role && payload.role !== role) return res.status(403).json({ error: "forbidden" });
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: "invalid token" });
    }
  };
}
