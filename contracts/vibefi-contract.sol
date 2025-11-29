// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VibeFi
 * @dev Enhanced "Vibe Check" Betting Contract with audience & player voting
 */
contract VibeFi {
    // --- Enums ---
    enum VoteType { YES, NO, NEUTRAL, SUPER_YES, SUPER_NO }
    enum SessionPhase { OPEN, PHASE1_VOTING, PHASE2_PLAYER_VOTING, RESOLVED }

    // --- State Variables ---
    address public oracle;

    struct VibeSession {
        bytes32 id;
        address creator;
        address[] participants; // All who joined
        address player1;
        address player2;
        uint256 createdAt;
        uint256 phase1StartTime;
        uint256 phase1EndTime;
        uint256 phase2EndTime;
        SessionPhase phase;
        bool resolved;
        bool player1Vote; // true = YES, false = NO
        bool player2Vote;
        uint256 totalPool;
    }

    struct Vote {
        address voter;
        VoteType voteType;
        uint256 amount;
    }

    // Session storage
    mapping(bytes32 => VibeSession) public sessions;
    bytes32[] public sessionIds;

    // Votes by session
    mapping(bytes32 => Vote[]) public sessionVotes;

    // User claim tracking
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    // --- Events ---
    event SessionCreated(bytes32 indexed sessionId, address indexed creator);
    event ParticipantJoined(bytes32 indexed sessionId, address indexed participant);
    event SessionStarted(
        bytes32 indexed sessionId,
        address indexed player1,
        address indexed player2,
        uint256 phase1EndTime,
        uint256 phase2EndTime
    );
    event VotePlaced(
        bytes32 indexed sessionId,
        address indexed voter,
        VoteType voteType,
        uint256 amount
    );
    event PlayerVoted(
        bytes32 indexed sessionId,
        address indexed player,
        bool voteYes
    );
    event SessionResolved(
        bytes32 indexed sessionId,
        bool player1Vote,
        bool player2Vote,
        bool resultYes
    );
    event WinningsClaimed(
        bytes32 indexed sessionId,
        address indexed claimer,
        uint256 amount
    );

    // --- Modifiers ---
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only Oracle can resolve");
        _;
    }

    modifier sessionExists(bytes32 sessionId) {
        require(sessions[sessionId].creator != address(0), "Session not found");
        _;
    }

    constructor() {
        oracle = msg.sender;
    }

    // --- Core Functions ---

    /**
     * @notice Creator initiates a new session
     */
    function createSession() external returns (bytes32) {
        bytes32 newId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, block.prevrandao)
        );

        sessions[newId] = VibeSession({
            id: newId,
            creator: msg.sender,
            participants: new address[](0),
            player1: address(0),
            player2: address(0),
            createdAt: block.timestamp,
            phase1StartTime: 0,
            phase1EndTime: 0,
            phase2EndTime: 0,
            phase: SessionPhase.OPEN,
            resolved: false,
            player1Vote: false,
            player2Vote: false,
            totalPool: 0
        });

        sessionIds.push(newId);
        emit SessionCreated(newId, msg.sender);
        return newId;
    }

    /**
     * @notice Anyone can join an OPEN session for free
     */
    function joinSession(bytes32 sessionId) external sessionExists(sessionId) {
        VibeSession storage s = sessions[sessionId];
        require(s.phase == SessionPhase.OPEN, "Session not open for joining");

        // Check if already joined
        for (uint256 i = 0; i < s.participants.length; i++) {
            require(
                s.participants[i] != msg.sender,
                "Already joined this session"
            );
        }

        s.participants.push(msg.sender);
        emit ParticipantJoined(sessionId, msg.sender);
    }

    /**
     * @notice Creator starts the session - randomly picks 2 players, locks participant list
     */
    function startSession(bytes32 sessionId)
        external
        sessionExists(sessionId)
    {
        VibeSession storage s = sessions[sessionId];
        require(s.creator == msg.sender, "Only creator can start");
        require(s.phase == SessionPhase.OPEN, "Session not in OPEN phase");
        require(
            s.participants.length >= 4,
            "Minimum 4 participants required"
        );

        // Randomly pick 2 players
        (address p1, address p2) = _pickTwoRandomPlayers(
            sessionId,
            s.participants
        );

        s.player1 = p1;
        s.player2 = p2;
        s.phase1StartTime = block.timestamp;
        s.phase1EndTime = block.timestamp + 4 minutes;
        s.phase2EndTime = s.phase1EndTime + 1 minutes;
        s.phase = SessionPhase.PHASE1_VOTING;

        emit SessionStarted(
            sessionId,
            p1,
            p2,
            s.phase1EndTime,
            s.phase2EndTime
        );
    }

    /**
     * @notice Audience votes during Phase 1 (4 minutes)
     * @param prediction YES, NO, NEUTRAL, SUPER_YES, or SUPER_NO
     * @param customAmount For SUPER votes, the custom stake amount
     */
    function placeAudienceVote(
        bytes32 sessionId,
        VoteType prediction,
        uint256 customAmount
    ) external payable sessionExists(sessionId) {
        VibeSession storage s = sessions[sessionId];
        require(
            s.phase == SessionPhase.PHASE1_VOTING,
            "Not in Phase 1 voting"
        );
        require(block.timestamp < s.phase1EndTime, "Phase 1 voting closed");

        // Verify voter is not a player
        require(msg.sender != s.player1, "Players cannot vote in Phase 1");
        require(msg.sender != s.player2, "Players cannot vote in Phase 1");

        // Verify voter is a participant
        bool isParticipant = false;
        for (uint256 i = 0; i < s.participants.length; i++) {
            if (s.participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "Must be a session participant");

        uint256 votingAmount;

        if (prediction == VoteType.YES || prediction == VoteType.NO) {
            require(
                msg.value == 0.5 ether ||
                    msg.value == 1 ether ||
                    msg.value == 1.5 ether,
                "Vote amount must be 0.5, 1, or 1.5 MON"
            );
            votingAmount = msg.value;
        } else if (prediction == VoteType.NEUTRAL) {
            require(msg.value == 0.1 ether, "NEUTRAL vote costs 0.1 MON");
            votingAmount = msg.value;
        } else if (
            prediction == VoteType.SUPER_YES ||
            prediction == VoteType.SUPER_NO
        ) {
            require(customAmount > 0, "SUPER vote must have custom amount");
            require(msg.value == customAmount, "Send exact custom amount");
            votingAmount = customAmount;
        }

        s.totalPool += votingAmount;

        Vote memory newVote = Vote({
            voter: msg.sender,
            voteType: prediction,
            amount: votingAmount
        });

        sessionVotes[sessionId].push(newVote);

        emit VotePlaced(sessionId, msg.sender, prediction, votingAmount);
    }

    /**
     * @notice Players vote during Phase 2 (1 minute) - must move to Phase 2 first
     */
    function moveToPhase2(bytes32 sessionId)
        external
        sessionExists(sessionId)
    {
        VibeSession storage s = sessions[sessionId];
        require(
            s.phase == SessionPhase.PHASE1_VOTING,
            "Not in Phase 1"
        );
        require(
            block.timestamp >= s.phase1EndTime,
            "Phase 1 still ongoing"
        );

        s.phase = SessionPhase.PHASE2_PLAYER_VOTING;
    }

    /**
     * @notice Players vote on if they vibe together
     */
    function playerVote(bytes32 sessionId, bool voteYes)
        external
        sessionExists(sessionId)
    {
        VibeSession storage s = sessions[sessionId];
        require(
            s.phase == SessionPhase.PHASE2_PLAYER_VOTING,
            "Not in Phase 2"
        );
        require(block.timestamp < s.phase2EndTime, "Phase 2 voting closed");

        require(
            msg.sender == s.player1 || msg.sender == s.player2,
            "Only players can vote in Phase 2"
        );

        if (msg.sender == s.player1) {
            require(s.player1Vote == false && s.player2Vote == false, "Already voted"); // Simple check, can improve
            s.player1Vote = voteYes;
        } else {
            require(s.player1Vote == false && s.player2Vote == false, "Already voted"); // Simple check
            s.player2Vote = voteYes;
        }

        emit PlayerVoted(sessionId, msg.sender, voteYes);
    }

    /**
     * @notice Resolve the session - can be called after Phase 2 ends
     */
    function resolveSession(bytes32 sessionId)
        external
        sessionExists(sessionId)
    {
        VibeSession storage s = sessions[sessionId];
        require(
            s.phase == SessionPhase.PHASE2_PLAYER_VOTING,
            "Not in Phase 2"
        );
        require(block.timestamp >= s.phase2EndTime, "Phase 2 still ongoing");
        require(!s.resolved, "Already resolved");

        // Result is YES only if BOTH players vote YES
        bool resultYes = (s.player1Vote && s.player2Vote);

        s.phase = SessionPhase.RESOLVED;
        s.resolved = true;

        emit SessionResolved(sessionId, s.player1Vote, s.player2Vote, resultYes);
    }

    /**
     * @notice Audience members claim their winnings
     */
    function claimWinnings(bytes32 sessionId) external sessionExists(sessionId) {
        VibeSession storage s = sessions[sessionId];
        require(s.resolved, "Session not resolved");
        require(!hasClaimed[sessionId][msg.sender], "Already claimed");

        // Determine if result was YES or NO
        bool resultYes = (s.player1Vote && s.player2Vote);

        // Get all winning votes
        Vote[] storage allVotes = sessionVotes[sessionId];
        uint256 userWinningAmount = 0;
        uint256 totalWinningAmount = 0;
        uint256 superBonusTotal = 0;

        // First pass: calculate totals and check if user won
        for (uint256 i = 0; i < allVotes.length; i++) {
            Vote storage v = allVotes[i];

            bool isWinningVote = false;
            if (resultYes) {
                isWinningVote = (v.voteType == VoteType.YES ||
                    v.voteType == VoteType.SUPER_YES);
            } else {
                isWinningVote = (v.voteType == VoteType.NO ||
                    v.voteType == VoteType.SUPER_NO);
            }

            if (isWinningVote) {
                totalWinningAmount += v.amount;

                if (
                    v.voteType == VoteType.SUPER_YES ||
                    v.voteType == VoteType.SUPER_NO
                ) {
                    uint256 bonus = (v.amount * 15) / 100;
                    superBonusTotal += bonus;
                }

                if (v.voter == msg.sender) {
                    userWinningAmount = v.amount;
                }
            }
        }

        require(userWinningAmount > 0, "No winning vote from you");

        hasClaimed[sessionId][msg.sender] = true;

        // Determine user's vote type
        VoteType userVoteType = VoteType.YES; // default
        for (uint256 i = 0; i < allVotes.length; i++) {
            if (allVotes[i].voter == msg.sender) {
                userVoteType = allVotes[i].voteType;
                break;
            }
        }

        uint256 payout = 0;

        if (
            userVoteType == VoteType.SUPER_YES ||
            userVoteType == VoteType.SUPER_NO
        ) {
            // SUPER voters get: stake + 15% bonus + proportional share of pool
            uint256 bonus = (userWinningAmount * 15) / 100;
            uint256 poolShare = (userWinningAmount * s.totalPool) /
                totalWinningAmount;
            payout = userWinningAmount + bonus + poolShare;
        } else {
            // Regular YES/NO/NEUTRAL voters share the pool proportionally
            uint256 poolShare = (userWinningAmount * s.totalPool) /
                totalWinningAmount;
            payout = poolShare;
        }

        require(payout > 0, "No payout calculated");

        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        require(sent, "ETH transfer failed");

        emit WinningsClaimed(sessionId, msg.sender, payout);
    }

    // --- Helper Functions ---

    /**
     * @notice Randomly pick 2 unique players from participants
     */
    function _pickTwoRandomPlayers(
        bytes32 sessionId,
        address[] memory participants
    ) internal view returns (address, address) {
        uint256 count = participants.length;

        // Generate two different random indices
        uint256 rand1 = uint256(
            keccak256(abi.encodePacked(sessionId, block.prevrandao, uint256(1)))
        ) % count;
        uint256 rand2 = uint256(
            keccak256(abi.encodePacked(sessionId, block.prevrandao, uint256(2)))
        ) % count;

        // Ensure they're different
        if (rand2 == rand1) {
            rand2 = (rand2 + 1) % count;
        }

        return (participants[rand1], participants[rand2]);
    }

    /**
     * @notice Get session details
     */
    function getSession(bytes32 sessionId)
        external
        view
        sessionExists(sessionId)
        returns (VibeSession memory)
    {
        return sessions[sessionId];
    }

    /**
     * @notice Get all votes for a session
     */
    function getSessionVotes(bytes32 sessionId)
        external
        view
        sessionExists(sessionId)
        returns (Vote[] memory)
    {
        return sessionVotes[sessionId];
    }

    /**
     * @notice Get session participant count
     */
    function getParticipantCount(bytes32 sessionId)
        external
        view
        sessionExists(sessionId)
        returns (uint256)
    {
        return sessions[sessionId].participants.length;
    }
}
