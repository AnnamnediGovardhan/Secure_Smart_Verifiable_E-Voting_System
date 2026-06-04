import { ethers } from "ethers";
import { config } from "../config.js";

// Minimal ABI matching VotingSystem.sol
const ABI = [
  "function register(bytes32 idCommitment)",
  "function batchRegister(bytes32[] idCommitments)",
  "function castVote(bytes32 idCommitment, bytes32 nullifier, bytes32 ballotCommitment, uint256 candidateId, bytes newEncryptedTally)",
  "function publishTally(uint256 candidateId, uint256 votes)",
  "function setPhase(uint8 p)",
  "function isRegistered(bytes32 idCommitment) view returns (bool)",
  "function encryptedTally(uint256) view returns (bytes)",
  "function candidateCount() view returns (uint256)",
  "function getCandidate(uint256 id) view returns (string)",
  "function registeredCount() view returns (uint256)",
  "function castCount() view returns (uint256)",
];

let contract = null;
export function getContract() {
  if (contract) return contract;
  if (!config.contractAddress || !config.registrarKey) {
    console.warn("[blockchain] CONTRACT_ADDRESS / REGISTRAR_PRIVATE_KEY not set — running in mock mode");
    return null;
  }
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.registrarKey, provider);
  contract = new ethers.Contract(config.contractAddress, ABI, wallet);
  return contract;
}

export async function readEncryptedTally(candidateId) {
  const c = getContract();
  if (!c) return "0x";
  return await c.encryptedTally(candidateId);
}
