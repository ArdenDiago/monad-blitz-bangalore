"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";
import { VIBEFI_ABI, CONTRACT_ADDRESS } from "@/lib/abi";

// FIX: Tell TypeScript that window.ethereum exists
declare global {
  interface Window {
    ethereum?: any;
  }
}

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
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);

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

        // Initialize contract
        if (CONTRACT_ADDRESS) {
          const _contract = new ethers.Contract(CONTRACT_ADDRESS, VIBEFI_ABI, _signer);
          setContract(_contract);
        } else {
          console.warn("Contract address not set, running in UI-only mode");
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

  const joinSession = async (sessionId: string) => {
    if (!contract) throw new Error("Contract not initialized");
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
      // Convert struct to object if needed, or return as is
      // Ethers v6 returns Result object which is array-like but has properties
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
      // DRASTICALLY reduce query range to avoid RPC 413 errors
      // Monad testnet RPC has VERY strict limits
      const currentBlock = await provider?.getBlockNumber();
      if (!currentBlock) return [];

      // Start with only 10 blocks - much more conservative
      let blockRange = 10;
      let fromBlock = Math.max(0, currentBlock - blockRange);

      const filter = contract.filters.SessionCreated();
      let events: any[] = [];

      try {
        // Try to fetch with 10 block range
        events = await contract.queryFilter(filter, fromBlock);
      } catch (error: any) {
        // If still fails with 413, try even smaller range
        if (error?.code === 'UNKNOWN_ERROR' || error?.message?.includes('413')) {
          console.warn('10 block range too large, trying 5 blocks...');
          blockRange = 5;
          fromBlock = Math.max(0, currentBlock - blockRange);
          try {
            events = await contract.queryFilter(filter, fromBlock);
          } catch (e2) {
            console.error('Even 5 block range failed, returning empty:', e2);
            return [];
          }
        } else {
          throw error; // Re-throw if it's a different error
        }
      }

      const sessionIds = events.map((e: any) => e.args[0]);

      // Reverse to show newest first
      const recentSessionIds = sessionIds.reverse();

      // Limit to max 10 sessions to avoid overwhelming the UI
      const limitedSessionIds = recentSessionIds.slice(0, 10);

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
      getAllSessions
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context);