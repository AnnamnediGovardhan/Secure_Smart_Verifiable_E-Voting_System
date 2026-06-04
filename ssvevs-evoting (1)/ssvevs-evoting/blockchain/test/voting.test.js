const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem", function () {
  let voting, authority, registrar, other;

  beforeEach(async () => {
    [authority, registrar, other] = await ethers.getSigners();
    const V = await ethers.getContractFactory("VotingSystem");
    voting = await V.deploy(["A", "B", "C"]);
    await voting.addRegistrar(registrar.address);
  });

  it("registers and prevents double registration", async () => {
    await voting.setPhase(1); // Registration
    const id = ethers.id("voter-1");
    await voting.connect(registrar).register(id);
    expect(await voting.isRegistered(id)).to.equal(true);
    await expect(voting.connect(registrar).register(id))
      .to.be.revertedWithCustomError(voting, "AlreadyRegistered");
  });

  it("prevents double voting via nullifier", async () => {
    await voting.setPhase(1);
    const id = ethers.id("voter-1");
    await voting.connect(registrar).register(id);
    await voting.setPhase(2); // Voting
    const nf = ethers.id("nullifier-1");
    const bc = ethers.id("ballot-1");
    await voting.connect(registrar).castVote(id, nf, bc, 0, "0x1234");
    await expect(
      voting.connect(registrar).castVote(id, nf, bc, 0, "0x1234")
    ).to.be.revertedWithCustomError(voting, "NullifierUsed");
  });
});
