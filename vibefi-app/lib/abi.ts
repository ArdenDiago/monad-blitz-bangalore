export const VIBEFI_ABI = [
  "function createSession() external returns (bytes32)",
  "function joinSession(bytes32 sessionId) external",
  "function startSession(bytes32 sessionId) external",
  "function placeAudienceVote(bytes32 sessionId, uint8 prediction, uint256 customAmount) external payable",
  "function moveToPhase2(bytes32 sessionId) external",
  "function playerVote(bytes32 sessionId, bool voteYes) external",
  "function resolveSession(bytes32 sessionId) external",
  "function claimWinnings(bytes32 sessionId) external",
  "function getSession(bytes32 sessionId) external view returns (tuple(bytes32 id, address creator, address[] participants, address player1, address player2, uint256 createdAt, uint256 phase1StartTime, uint256 phase1EndTime, uint256 phase2EndTime, uint8 phase, bool resolved, bool player1Vote, bool player2Vote, uint256 totalPool))",
  "function getSessionVotes(bytes32 sessionId) external view returns (tuple(address voter, uint8 voteType, uint256 amount)[])",
  "function getParticipantCount(bytes32 sessionId) external view returns (uint256)",
  "function sessionIds(uint256) external view returns (bytes32)",
  "event SessionCreated(bytes32 indexed sessionId, address indexed creator)",
  "event ParticipantJoined(bytes32 indexed sessionId, address indexed participant)",
  "event SessionStarted(bytes32 indexed sessionId, address indexed player1, address indexed player2, uint256 phase1EndTime, uint256 phase2EndTime)",
  "event VotePlaced(bytes32 indexed sessionId, address indexed voter, uint8 voteType, uint256 amount)",
  "event PlayerVoted(bytes32 indexed sessionId, address indexed player, bool voteYes)",
  "event SessionResolved(bytes32 indexed sessionId, bool player1Vote, bool player2Vote, bool resultYes)",
  "event WinningsClaimed(bytes32 indexed sessionId, address indexed claimer, uint256 amount)"
];

export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Replace with actual address after deployment
