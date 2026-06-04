import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  contractAddress: process.env.CONTRACT_ADDRESS || "",
  registrarKey: process.env.REGISTRAR_PRIVATE_KEY || "",
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://127.0.0.1:8000",
  idCommitSalt: process.env.ID_COMMIT_SALT || "salt",
};
