const hre = require("hardhat");

async function main() {
  const candidates = ["PDP", "APC", "Labour Party", "NNPP"];
  const Voting = await hre.ethers.getContractFactory("VotingSystem");
  const voting = await Voting.deploy(candidates);
  await voting.waitForDeployment();
  const addr = await voting.getAddress();
  console.log("VotingSystem deployed to:", addr);
  console.log("Candidates:", candidates.join(", "));
  console.log("\nAdd this to backend/.env  ->  CONTRACT_ADDRESS=" + addr);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
