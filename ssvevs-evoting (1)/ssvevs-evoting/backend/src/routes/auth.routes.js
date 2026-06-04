import { Router } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { issueOtp, verifyOtp } from "../services/otp.service.js";

const r = Router();

// Step 1: request an OTP (NEW second factor)
r.post("/otp/request", (req, res) => {
  const { voterId } = req.body;
  if (!voterId) return res.status(400).json({ error: "voterId required" });
  issueOtp(voterId);
  res.json({ ok: true, message: "OTP issued (check SMS/email)" });
});

// Step 2: verify OTP -> issue session token
r.post("/otp/verify", (req, res) => {
  const { voterId, code, role = "voter" } = req.body;
  if (!verifyOtp(voterId, code)) return res.status(401).json({ error: "bad otp" });
  const token = jwt.sign({ sub: voterId, role }, config.jwtSecret, { expiresIn: "1h" });
  res.json({ ok: true, token });
});

export default r;
