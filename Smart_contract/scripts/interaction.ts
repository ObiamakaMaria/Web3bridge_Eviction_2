import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

async function main() {
    const [owner, seller, buyer] = await ethers.getSigners();
    
    // First deploy the Mock ERC20 token
    console.log("Deploying Mock ERC20 token...");
    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy("AMAKA-TOKEN", "AMAKS");
    await token.deploymentTransaction()?.wait();
    console.log("Mock Token deployed to:", await token.getAddress());
    
   
    const TOKEN_AMOUNT = ethers.parseEther("100");
    const START_PRICE = ethers.parseEther("1");
    const END_PRICE = ethers.parseEther("0.1");
    const DURATION = 3600; 
    

    await token.mint(seller.address, TOKEN_AMOUNT);
    console.log(`\nMinted ${ethers.formatEther(TOKEN_AMOUNT)} tokens to seller`);
    
    console.log("\nDeploying ReverseDutch contract...");
    const ReverseDutch = await ethers.getContractFactory("ReverseDutch", seller);
    const reverseDutch = await ReverseDutch.deploy(
        await token.getAddress(),
        TOKEN_AMOUNT,
        START_PRICE,
        END_PRICE,
        DURATION
    );
    await reverseDutch.deploymentTransaction()?.wait();
    console.log("ReverseDutch deployed to:", await reverseDutch.getAddress());
    
    await token.connect(seller).approve(await reverseDutch.getAddress(), TOKEN_AMOUNT);
    console.log("\nSeller approved tokens for auction");
    
    
    await reverseDutch.connect(seller).startAuction();
    console.log("Auction started!");
    
    let currentPrice = await reverseDutch.getCurrentPrice();
    console.log("\nInitial price:", ethers.formatEther(currentPrice), "ETH");
    

    const intervals = [900, 1800, 2700, 3600]; 
    for (const interval of intervals) {
        await time.increase(interval - (interval > 900 ? intervals[intervals.indexOf(interval) - 1] : 0));
        currentPrice = await reverseDutch.getCurrentPrice();
        console.log(`Price after ${interval/60} minutes:`, ethers.formatEther(currentPrice), "ETH");
    }
    
    
    console.log("\nSimulating purchase...");
    const purchasePrice = await reverseDutch.getCurrentPrice();
    await reverseDutch.connect(buyer).purchase({ value: purchasePrice });
    
    
    const buyerTokenBalance = await token.balanceOf(buyer.address);
    console.log(`\nBuyer received ${ethers.formatEther(buyerTokenBalance)} tokens`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });vd
