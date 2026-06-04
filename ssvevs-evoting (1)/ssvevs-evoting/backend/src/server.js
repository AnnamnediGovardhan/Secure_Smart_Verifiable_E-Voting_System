import express from "express";
import cors from "cors";
import { config } from "./config.js";
import authRoutes from "./routes/auth.routes.js";
import voterRoutes from "./routes/voter.routes.js";
import voteRoutes from "./routes/vote.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" })); // base64 biometric payloads

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/voter", voterRoutes);
app.use("/api/vote", voteRoutes);
app.use("/api/admin", adminRoutes);

app.listen(config.port, () =>
  console.log(`SSVEVS backend listening on http://localhost:${config.port}`)
);
