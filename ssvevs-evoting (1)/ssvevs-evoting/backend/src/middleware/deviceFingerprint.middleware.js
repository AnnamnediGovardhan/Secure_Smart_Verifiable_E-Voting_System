// Device fingerprinting (NEW): lightweight signal combined with anomaly model.
import { createHash } from "crypto";

export function deviceFingerprint(req, _res, next) {
  const ua = req.headers["user-agent"] || "";
  const accept = req.headers["accept-language"] || "";
  const ip = req.ip || req.connection?.remoteAddress || "";
  req.deviceFingerprint = createHash("sha256").update(`${ua}|${accept}|${ip}`).digest("hex");
  next();
}
