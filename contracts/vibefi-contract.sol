// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VibeFi
 * @dev 1-Hour Hackathon Build - "Vibe Check" Betting Contract
 */
contract VibeFi {
    // --- State Variables ---
    address public oracle; // The authority (AI Agent or Backend) that resolves vibes

    struct VibeSession {
        bytes32 id;
        address player1;
        address player2;
        uint256 startTime;
        uint256 endTime;
        bool resolved;
        bool outcomeMatch; // True if vibes matched, False if failed
        uint256 totalPool; // Total ETH in the session
    }

    // Session storage
    mapping(bytes32 => VibeSession) public sessions;
    bytes32[] public sessionIds;
    
    // Quick lookup for pending matchmaking
    bytes32 public pendingSessionId;

    // Betting Pools (SessionId => Total Amount)
    mapping(bytes32 => uint256) public betsMatch;
    mapping(bytes32 => uint256) public betsFail;

    // User tracking (SessionId => User => Amount Bet on Outcome)
    // mapping(sessionId => mapping(address => amount))
    mapping(bytes32 => mapping(address => uint256)) public userBetsMatch;
    mapping(bytes32 => mapping(address => uint256)) public userBetsFail;
    
    // Prevent double claiming
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    // --- Events ---
    event SessionCreated(bytes32 indexed sessionId, address indexed player1);
    event SessionStarted(bytes32 indexed sessionId, address indexed player1, address indexed player2, uint256 endTime);
    event BetPlaced(bytes32 indexed sessionId, address indexed better, bool prediction, uint256 amount);
    event SessionResolved(bytes32 indexed sessionId, bool vibe1, bool vibe2, bool resultMatch);

    // --- Modifiers ---
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only Oracle can resolve");
        _;
    }

    constructor() {
        oracle = msg.sender; // Deployer is the oracle for now
    }

    // --- Core Logic ---

    /**
     * @notice Matchmaking logic. 
     * If a pending session exists, join it. If not, create a new one.
     */
    function createSession() public payable {
        // Simple entry fee or anti-spam could go here, keeping it open for now
        
        if (pendingSessionId == 0) {
            // Create new session
            bytes32 newId = keccak256(abi.encodePacked(msg.sender, block.timestamp, block.prevrandao));
            
            sessions[newId] = VibeSession({
                id: newId,
                player1: msg.sender,
                player2: address(0),
                startTime: 0,
                endTime: 0,
                resolved: false,
                outcomeMatch: false,
                totalPool: 0
            });
            
            pendingSessionId = newId;
            sessionIds.push(newId);
            
            emit SessionCreated(newId, msg.sender);
        } else {
            // Join pending session
            bytes32 sId = pendingSessionId;
            VibeSession storage s = sessions[sId];
            
            require(s.player1 != msg.sender, "Cannot play against yourself");
            
            s.player2 = msg.sender;
            s.startTime = block.timestamp;
            s.endTime = block.timestamp + 5 minutes; // 5 minute vibe check window
            
            // Clear pending status
            pendingSessionId = 0;
            
            emit SessionStarted(sId, s.player1, s.player2, s.endTime);
        }
    }

    /**
     * @notice High TPS betting function
     * @param sessionId The ID of the session to bet on
     * @param prediction true = 'Match' (Vibes Align), false = 'Fail' (Vibes Clash)
     */
    function placeBet(bytes32 sessionId, bool prediction) public payable {
        require(msg.value > 0, "Must bet ETH");
        VibeSession storage s = sessions[sessionId];
        require(s.player2 != address(0), "Session not active");
        require(!s.resolved, "Session already resolved");
        require(block.timestamp < s.endTime, "Betting closed");

        s.totalPool += msg.value;

        if (prediction) {
            // Bet on Match
            betsMatch[sessionId] += msg.value;
            userBetsMatch[sessionId][msg.sender] += msg.value;
        } else {
            // Bet on Fail
            betsFail[sessionId] += msg.value;
            userBetsFail[sessionId][msg.sender] += msg.value;
        }

        emit BetPlaced(sessionId, msg.sender, prediction, msg.value);
    }

    /**
     * @notice Called by the AI/Backend to settle the vibe check
     */
    function resolve(bytes32 sessionId, bool vibe1, bool vibe2) public onlyOracle {
        VibeSession storage s = sessions[sessionId];
        require(!s.resolved, "Already resolved");

        bool resultMatch = (vibe1 == vibe2);
        
        s.outcomeMatch = resultMatch;
        s.resolved = true;

        emit SessionResolved(sessionId, vibe1, vibe2, resultMatch);
    }

    /**
     * @notice Winners claim their share
     * Logic: (UserBet / TotalWinningBets) * TotalPool
     */
    function claim(bytes32 sessionId) public {
        VibeSession storage s = sessions[sessionId];
        require(s.resolved, "Not resolved yet");
        require(!hasClaimed[sessionId][msg.sender], "Already claimed");

        uint256 payout = 0;
        uint256 userBetAmount = 0;
        uint256 totalWinningPool = 0;

        if (s.outcomeMatch) {
            // Match Won
            userBetAmount = userBetsMatch[sessionId][msg.sender];
            totalWinningPool = betsMatch[sessionId];
        } else {
            // Fail Won
            userBetAmount = userBetsFail[sessionId][msg.sender];
            totalWinningPool = betsFail[sessionId];
        }

        require(userBetAmount > 0, "No winning bet");

        // Calculate Share: (UserBet * TotalPool) / TotalWinningSide
        // If one side had 0 bets, the money is stuck (Edge case ignored for Hackathon speed)
        if (totalWinningPool > 0) {
            payout = (userBetAmount * s.totalPool) / totalWinningPool;
        }

        hasClaimed[sessionId][msg.sender] = true;
        
        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        require(sent, "ETH transfer failed");
    }

    // --- Admin/Safety for Hackathon ---
    function setOracle(address _oracle) external onlyOracle {
        oracle = _oracle;
    }
}