import { createHash, randomBytes } from "crypto";

/** Identity commitment = SHA256(NIN || biometricHash || salt). Plaintext never stored. */
export function idCommitment(nin, biometricHash, salt) {
  return "0x" + createHash("sha256").update(`${nin}|${biometricHash}|${salt}`).digest("hex");
}

/** One-time nullifier so a registered voter cannot vote twice (ZKP-style). */
export function makeNullifier(secret) {
  return "0x" + createHash("sha256").update(`nullifier|${secret}`).digest("hex");
}

/** Ballot commitment = SHA256(candidateId || randomness) — hides the choice on-chain. */
export function ballotCommitment(candidateId) {
  const r = randomBytes(16).toString("hex");
  const c = "0x" + createHash("sha256").update(`${candidateId}|${r}`).digest("hex");
  return { commitment: c, randomness: r };
}

/**
 * Placeholder additive-homomorphic accumulator. In production call a Paillier
 * library (e.g. paillier-bigint) so tallies combine ciphertexts without
 * decrypting. Returned bytes are stored on-chain as the encrypted tally handle.
 */
export function homomorphicAdd(prevHex, candidateId) {
  const base = prevHex && prevHex !== "0x" ? prevHex.slice(2) : "00";
  const next = createHash("sha256").update(`${base}|${candidateId}`).digest("hex");
  return "0x" + next;
}
