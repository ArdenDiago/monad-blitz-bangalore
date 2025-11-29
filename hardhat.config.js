require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20", // Make sure this matches the version in your .sol file
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // 👈 THIS IS THE FIX FOR "Stack too deep"
    },
  },
  networks: {
    monad: {
      url: process.env.MONAD_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 10143,
    },
  },
  sourcify: {
    enabled: false
  }
};