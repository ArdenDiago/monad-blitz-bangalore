"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";
import { VIBEFI_ABI } from "@/lib/abi"; 
import config from "@/lib/contract-address.json"; // 👈 IMPORT THE AUTO-GENERATED FILE

// FIX: Tell TypeScript that window.ethereum exists
declare global {
  interface Window {
    ethereum?: any;
  }
}

// LocalStorage key for tracking session IDs
const TRACKED_SESSIONS_KEY = "vibefi_tracked_sessions";

interface Web3ContextType {
  account: string | null;
  connectWallet: () => Promise<void>;
  contract: ethers.Contract | null;
  provider: ethers.BrowserProvider | null;
  chainId: string | null;
  joinSession: (sessionId: string) => Promise<void>;
  placeVote: (sessionId: string, voteType: number, amount: string) => Promise<void>;
  getSession: (sessionId: string) => Promise<any>;
  startSession: (sessionId: string) => Promise<void>;
  playerVote: (sessionId: string, vote: boolean) => Promise<void>;
  claimWinnings: (sessionId: string) => Promise<void>;
  getAllSessions: () => Promise<any[]>;
  createSession: () => Promise<string>; // Returns session ID
  trackSessionId: (sessionId: string) => void; // Track a session locally
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  connectWallet: async () => { },
  contract: null,
  provider: null,
  chainId: null,
  joinSession: async () => { },
  placeVote: async () => { },
  getSession: async () => { return null; },
  startSession: async () => { },
  playerVote: async () => { },
  claimWinnings: async () => { },
  getAllSessions: async () => { return []; },
  createSession: async () => { return ""; },
  trackSessionId: () => { },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);

  // Helper functions for localStorage
  const getTrackedSessionIds = (): string[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(TRACKED_SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  };

  const trackSessionId = (sessionId: string) => {
    if (typeof window === "undefined") return;
    const tracked = getTrackedSessionIds();
    if (!tracked.includes(sessionId)) {
      tracked.unshift(sessionId); // Add to beginning
      // Keep only last 20 sessions
      const limited = tracked.slice(0, 20);
      localStorage.setItem(TRACKED_SESSIONS_KEY, JSON.stringify(limited));
    }
  };

  const connectWallet = async () => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await _provider.send("eth_requestAccounts", []);
        const _signer = await _provider.getSigner();
        const network = await _provider.getNetwork();
        const _chainId = network.chainId.toString();

        setAccount(accounts[0]);
        setProvider(_provider);
        setChainId(_chainId);

        // ------------------------------------------------------------
        // FIX: Use the address from the JSON file
        // ------------------------------------------------------------
        const dynamicAddress = config.contractAddress;

        if (dynamicAddress && dynamicAddress.startsWith("0x")) {
          const _contract = new ethers.Contract(dynamicAddress, VIBEFI_ABI, _signer);
          setContract(_contract);
          console.log("Connected to contract at:", dynamicAddress);
        } else {
          console.warn("Contract address not set in lib/contract-address.json");
        }

      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      alert("Please install Metamask or another Web3 wallet!");
    }
  };

  useEffect(() => {
    // Check if already connected
    const checkConnection = async () => {
      if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
        try {
          const _provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await _provider.listAccounts();
          if (accounts.length > 0) {
            connectWallet();
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };
    checkConnection();
  }, []);

  const createSession = async (): Promise<string> => {
    if (!contract) throw new Error("Contract not initialized");
    const tx = await contract.createSession();
    const receipt = await tx.wait();

    // Find the SessionCreated event to get the session ID
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "SessionCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = contract.interface.parseLog(event);
      const sessionId = parsed?.args[0];
      if (sessionId) {
        trackSessionId(sessionId); // Store it locally
        return sessionId;
      }
    }

    throw new Error("Could not extract session ID from transaction");
  };

  const joinSession = async (sessionId: string) => {
    if (!contract) throw new Error("Contract not initialized");
    trackSessionId(sessionId); // Track when joining
    const tx = await contract.joinSession(sessionId);
    await tx.wait();
  };

  const placeVote = async (sessionId: string, voteType: number, amount: string) => {
    if (!contract) throw new Error("Contract not initialized");
    const tx = await contract.placeAudienceVote(sessionId, voteType, ethers.parseEther(amount), {
      value: ethers.parseEther(amount)
    });
    await tx.wait();
  };

  const getSession = async (sessionId: string) => {
    if (!contract) return null;
    try {
      const session = await contract.getSession(sessionId);
      return {
        id: session.id,
        creator: session.creator,
        participants: session.participants,
        player1: session.player1,
        player2: session.player2,
        createdAt: session.createdAt,
        phase1StartTime: session.phase1StartTime,
        phase1EndTime: session.phase1EndTime,
        phase2EndTime: session.phase2EndTime,
        phase: ["OPEN", "PHASE1_VOTING", "PHASE2_PLAYER_VOTING", "RESOLVED"][Number(session.phase)],
        resolved: session.resolved,
        player1Vote: session.player1Vote,
        player2Vote: session.player2Vote,
        totalPool: ethers.formatEther(session.totalPool)
      };
    } catch (e) {
      console.error("Error fetching session:", e);
      return null;
    }
  };

  const startSession = async (sessionId: string) => {
    if (!contract) throw new Error("Contract not initialized");
    const tx = await contract.startSession(sessionId);
    await tx.wait();
  };

  const playerVote = async (sessionId: string, vote: boolean) => {
    if (!contract) throw new Error("Contract not initialized");
    const tx = await contract.playerVote(sessionId, vote);
    await tx.wait();
  };

  const claimWinnings = async (sessionId: string) => {
    if (!contract) throw new Error("Contract not initialized");
    const tx = await contract.claimWinnings(sessionId);
    await tx.wait();
  };

  const getAllSessions = async () => {
    if (!contract || !provider) return [];
    try {
      // Fetch tracked sessions from localStorage
      const trackedIds = getTrackedSessionIds();

      // Fetch recent sessions from blockchain (limited range)
      const currentBlock = await provider.getBlockNumber();
      if (!currentBlock) return [];

      let blockRange = 10;
      let fromBlock = Math.max(0, currentBlock - blockRange);
      const filter = contract.filters.SessionCreated();
      let events: any[] = [];

      try {
        events = await contract.queryFilter(filter, fromBlock);
      } catch (error: any) {
        if (error?.code === 'UNKNOWN_ERROR' || error?.message?.includes('413')) {
          console.warn('10 block range too large, trying 5 blocks...');
          blockRange = 5;
          fromBlock = Math.max(0, currentBlock - blockRange);
          try {
            events = await contract.queryFilter(filter, fromBlock);
          } catch (e2) {
            console.error('Even 5 block range failed:', e2);
            events = []; // Continue with tracked sessions only
          }
        } else {
          throw error;
        }
      }

      const recentSessionIds = events.map((e: any) => e.args[0]);

      // Combine both sources and remove duplicates
      const allSessionIds = [...new Set([...recentSessionIds, ...trackedIds])];

      // Limit to 20 sessions max
      const limitedSessionIds = allSessionIds.slice(0, 20);

      // Fetch all session data
      const sessions = await Promise.all(limitedSessionIds.map(id => getSession(id)));
      return sessions.filter(s => s !== null);
    } catch (e) {
      console.error("Error fetching all sessions:", e);
      return [];
    }
  };

  return (
    <Web3Context.Provider value={{
      account,
      connectWallet,
      contract,
      provider,
      chainId,
      joinSession,
      placeVote,
      getSession,
      startSession,
      playerVote,
      claimWinnings,
      getAllSessions,
      createSession,
      trackSessionId
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context);