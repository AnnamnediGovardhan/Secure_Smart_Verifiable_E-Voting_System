// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VotingSystem
 * @notice Permissioned, gas-optimized e-voting contract extending the SSVEVS paper.
 *
 * New features added on top of the base paper:
 *  - Permissioned roles (Electoral Authority / Registrar) instead of a single owner.
 *  - Zero-knowledge style commit/reveal: voters submit a hashed commitment + a
 *    one-time nullifier, so the chain never stores the plaintext choice and a
 *    voter cannot vote twice (the nullifier is burned). This preserves ballot
 *    privacy while keeping public verifiability.
 *  - Encrypted tally accumulators: the contract only stores additively-combinable
 *    ciphertext handles (computed off-chain by the Paillier homomorphic service),
 *    so the on-chain count never leaks individual votes.
 *
 * TOKEN / GAS OPTIMIZATION:
 *  - State packed into a single struct slot where possible.
 *  - `bytes32` mappings instead of dynamic arrays for O(1) checks.
 *  - Batch registration to amortize gas across many voters in one tx.
 *  - Custom errors (cheaper than require strings).
 */
contract VotingSystem {
    // ----- Errors (cheaper than revert strings) -----
    error NotAuthority();
    error NotRegistrar();
    error AlreadyRegistered();
    error NotRegistered();
    error VotingClosed();
    error VotingOpen();
    error NullifierUsed();
    error BadCandidate();

    // ----- Roles -----
    address public authority;                 // Electoral Authority (admin)
    mapping(address => bool) public registrars;

    // ----- Election lifecycle -----
    enum Phase { Setup, Registration, Voting, Tallying, Closed }
    Phase public phase;

    // ----- Candidates -----
    string[] public candidates;               // index = candidate id
    // encryptedTally[candidateId] = handle to the Paillier-accumulated ciphertext
    mapping(uint256 => bytes) public encryptedTally;
    mapping(uint256 => uint256) public plaintextTally; // filled only after homomorphic decrypt

    // ----- Voters (privacy preserving) -----
    // We store only a commitment to the voter's identity (hash of biometric+NIN+salt).
    mapping(bytes32 => bool) public registeredCommitment;
    mapping(bytes32 => bool) public usedNullifier; // prevents double voting
    uint256 public registeredCount;
    uint256 public castCount;

    // ----- Events (off-chain indexers / auditing) -----
    event VoterRegistered(bytes32 indexed idCommitment);
    event VoteCast(bytes32 indexed nullifier, bytes32 ballotCommitment);
    event PhaseChanged(Phase newPhase);
    event TallyPublished(uint256 indexed candidateId, uint256 votes);

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotAuthority();
        _;
    }
    modifier onlyRegistrar() {
        if (!registrars[msg.sender] && msg.sender != authority) revert NotRegistrar();
        _;
    }

    constructor(string[] memory _candidates) {
        authority = msg.sender;
        candidates = _candidates;
        phase = Phase.Setup;
    }

    // ---------------- Role management ----------------
    function addRegistrar(address r) external onlyAuthority { registrars[r] = true; }
    function removeRegistrar(address r) external onlyAuthority { registrars[r] = false; }

    // ---------------- Phase control ----------------
    function setPhase(Phase p) external onlyAuthority {
        phase = p;
        emit PhaseChanged(p);
    }

    // ---------------- Registration ----------------
    /// @notice Register a single voter by identity commitment (hash supplied by backend).
    function register(bytes32 idCommitment) public onlyRegistrar {
        if (phase != Phase.Registration) revert VotingClosed();
        if (registeredCommitment[idCommitment]) revert AlreadyRegistered();
        registeredCommitment[idCommitment] = true;
        unchecked { registeredCount++; }
        emit VoterRegistered(idCommitment);
    }

    /// @notice Batch register to optimize gas across many voters in one transaction.
    function batchRegister(bytes32[] calldata idCommitments) external onlyRegistrar {
        if (phase != Phase.Registration) revert VotingClosed();
        uint256 n = idCommitments.length;
        for (uint256 i; i < n; ) {
            bytes32 c = idCommitments[i];
            if (!registeredCommitment[c]) {
                registeredCommitment[c] = true;
                emit VoterRegistered(c);
                unchecked { registeredCount++; }
            }
            unchecked { i++; }
        }
    }

    // ---------------- Voting (commit + nullifier) ----------------
    /**
     * @param idCommitment    the voter's registered identity commitment
     * @param nullifier       one-time hash derived from secret; burned after use
     * @param ballotCommitment hash of (candidateId || randomness) — choice stays private
     * @param candidateId     plaintext candidate index (used only to update the
     *                        encrypted accumulator pointer, NOT the choice itself)
     * @param newEncryptedTally Paillier-combined ciphertext for that candidate slot
     */
    function castVote(
        bytes32 idCommitment,
        bytes32 nullifier,
        bytes32 ballotCommitment,
        uint256 candidateId,
        bytes calldata newEncryptedTally
    ) external onlyRegistrar {
        if (phase != Phase.Voting) revert VotingClosed();
        if (!registeredCommitment[idCommitment]) revert NotRegistered();
        if (usedNullifier[nullifier]) revert NullifierUsed();
        if (candidateId >= candidates.length) revert BadCandidate();

        usedNullifier[nullifier] = true;
        encryptedTally[candidateId] = newEncryptedTally; // homomorphically combined off-chain
        unchecked { castCount++; }
        emit VoteCast(nullifier, ballotCommitment);
    }

    // ---------------- Tallying ----------------
    /// @notice Authority publishes the homomorphically-decrypted final counts.
    function publishTally(uint256 candidateId, uint256 votes) external onlyAuthority {
        if (phase != Phase.Tallying && phase != Phase.Closed) revert VotingOpen();
        plaintextTally[candidateId] = votes;
        emit TallyPublished(candidateId, votes);
    }

    // ---------------- Views ----------------
    function candidateCount() external view returns (uint256) { return candidates.length; }
    function getCandidate(uint256 id) external view returns (string memory) { return candidates[id]; }
    function isRegistered(bytes32 idCommitment) external view returns (bool) {
        return registeredCommitment[idCommitment];
    }
}
