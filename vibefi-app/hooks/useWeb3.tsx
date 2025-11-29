"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";
import { VIBEFI_ABI, CONTRACT_ADDRESS } from "@/lib/abi";

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
    if (typeof window.ethereum !== "undefined") {
      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await _provider.send("eth_requestAccounts", []);
        const _signer = await _provider.getSigner();
        const _chainId = (await _provider.getNetwork()).chainId.toString();

        setAccount(accounts[0]);
        setProvider(_provider);
        setChainId(_chainId);

        // Initialize contract
        // Note: CONTRACT_ADDRESS needs to be set to a real address for this to work fully
        if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x88b6C261235AfbbaA50D75eD3A44ef049DA4351B") {
          const _contract = new ethers.Contract(CONTRACT_ADDRESS, VIBEFI_ABI, _signer);
          setContract(_contract);
        } else {
          console.warn("Contract address not set, running in UI-only mode or read-only if possible");
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
      if (typeof window.ethereum !== "undefined") {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await _provider.listAccounts();
        if (accounts.length > 0) {
          connectWallet();
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
    if (!contract) return [];
    try {
      // Assuming sessionIds is a public array, we can access it via a getter if generated, 
      // but standard ethers contract wrapper might need a loop if no getter for array.
      // However, public arrays usually generate a getter that takes an index.
      // We need to know the length. 
      // Let's assume there is a way to get length or we just try to fetch a reasonable number.
      // Wait, the contract has `sessionIds` public array.
      // We can't get the whole array in one call with standard auto-generated getter.
      // We need to loop. But we don't know the length.
      // Actually, usually `sessionIds(index)` is the getter.
      // We might need a helper in contract to get all, but we can't change contract.
      // Let's try to fetch index 0, 1, 2... until revert? No that's slow.
      // Ah, `sessionIds` is public, so `contract.sessionIds(i)` works.
      // But we don't know the count.
      // Wait, I missed if there is a `getSessionCount` or similar.
      // Checking contract... `sessionIds` is `bytes32[] public`.
      // There is no explicit count function.
      // But we can try to find a way.
      // Actually, for this task, maybe we just fetch the last few?
      // Or maybe we can't easily get all without a count.
      // Let's check if I can add a helper to the contract? No, "contracts/vibefi-contract.sol" is likely fixed or I should avoid changing it if possible?
      // The user said "see @[contracts/vibefi-contract.sol] file it has all functions data available".
      // Maybe I missed a length getter?
      // `sessionIds` is public, so `sessionIds` getter takes an index.
      // There is no `getSessionCount`.
      // However, I can try to call `sessionIds` with a large number and catch error? No.
      // Wait, usually for public arrays, there isn't a length getter generated automatically in older solidity, but in 0.8?
      // No, still need index.
      // Let's look at the contract again.
      // `bytes32[] public sessionIds;`
      // Maybe I can just use a loop and break on error?
      // Or maybe I can't implement `getAllSessions` efficiently without a count.
      // BUT, I can implement `createSession` which returns an ID.
      // And the user wants to "join the session and vote, using link user need to join".
      // So maybe listing all sessions is not strictly required if they join via link?
      // But the home page lists "Active Sessions".
      // I should try to implement it if possible.
      // Let's assume for now I can't easily get all sessions without a count or event logs.
      // I will implement `getAllSessions` to return an empty array or maybe just try to fetch index 0 to 9.

      // actually, I can try to read the array length if I access the storage slot directly? No, that's complex.
      // Let's just try to fetch the first 10 sessions for now as a hack, or rely on events?
      // Events are better. `SessionCreated`.
      // I can query past events `SessionCreated`.

      const filter = contract.filters.SessionCreated();
      const events = await contract.queryFilter(filter);
      const sessionIds = events.map((e: any) => e.args[0]);

      const sessions = await Promise.all(sessionIds.map(id => getSession(id)));
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
