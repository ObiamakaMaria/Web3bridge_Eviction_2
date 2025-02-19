import { ethers } from "hardhat";

async function main() {
  
    console.log("Deploying Mock ERC20 token...");
    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy("Mock Token", "MTK");
    await token.deploymentTransaction()?.wait();
    console.log("Mock Token deployed to:", await token.getAddress());
    
    
    const TOKEN_AMOUNT = ethers.parseEther("100");
    const START_PRICE = ethers.parseEther("1");
    const END_PRICE = ethers.parseEther("0.1");
    const DURATION = 3600; 
    
    
    console.log("\nDeploying ReverseDutch contract...");
    const ReverseDutch = await ethers.getContractFactory("ReverseDutch");
    const reverseDutch = await ReverseDutch.deploy(
        await token.getAddress(),
        TOKEN_AMOUNT,
        START_PRICE,
        END_PRICE,
        DURATION
    );
    await reverseDutch.deploymentTransaction()?.wait();
    console.log("ReverseDutch deployed to:", await reverseDutch.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 

    