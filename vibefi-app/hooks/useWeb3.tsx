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
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  connectWallet: async () => { },
  contract: null,
  provider: null,
  chainId: null,
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
        if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
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

  return (
    <Web3Context.Provider value={{ account, connectWallet, contract, provider, chainId }}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context);
