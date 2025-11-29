// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment script...");

  // 1. TELL HARDHAT WHICH CONTRACT TO DEPLOY
  // IMPORTANT: The name inside quotes must match the "class" name inside your .sol file,
  // NOT necessarily the filename. 
  // If your file is "vibefi-contract.sol", open it and check "contract XXXXX {"
  const ContractName = "VibeFi"; 
  
  const ContractFactory = await hre.ethers.getContractFactory(ContractName);

  // 2. TRIGGER THE DEPLOYMENT
  // If your constructor needs arguments (like an initial supply), put them inside .deploy(arg1, arg2)
  const contract = await ContractFactory.deploy(); 

  // 3. WAIT FOR BLOCKCHAIN CONFIRMATION
  await contract.waitForDeployment();

  // 4. GET THE ADDRESS
  const address = await contract.getAddress();

  // 5. PRINT IT (Crucial for GitHub Actions!)
  console.log("----------------------------------------------------");
  console.log(`Contract deployed to: ${address}`);
  console.log("----------------------------------------------------");
}

// Boilerplate to run the async function
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});