require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // This loads the env vars

module.exports = {
  solidity: "0.8.20", // Or your version
  networks: {
    monad: {
      url: process.env.MONAD_RPC_URL, // Reads the Secret from GitHub
      accounts: [process.env.PRIVATE_KEY], // Reads the Private Key from GitHub
      chainId: 10143, // (Check the correct Chain ID for Monad Testnet, currently often 10143 or 20143)
    },
  },
};