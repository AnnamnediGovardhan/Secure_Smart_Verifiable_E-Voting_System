import axios from "axios";
import { config } from "../config.js";

const client = axios.create({ baseURL: config.mlServiceUrl, timeout: 15000 });

export async function enrollFace(image_b64) {
  const { data } = await client.post("/enroll/face", { image_b64 });
  return data;
}

export async function verifyMultimodal(payload) {
  const { data } = await client.post("/verify", payload);
  return data;
}

export async function anomalyCheck(payload) {
  const { data } = await client.post("/anomaly/check", payload);
  return data;
}
