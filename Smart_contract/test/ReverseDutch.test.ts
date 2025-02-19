import { expect } from "chai";
import { ethers } from "hardhat";
import { ReverseDutch, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ReverseDutch", function () {
    let token: MockERC20;
    let reverseDutch: ReverseDutch;
    let owner: HardhatEthersSigner;
    let seller: HardhatEthersSigner;
    let buyer: HardhatEthersSigner;
    
    const TOKEN_AMOUNT = ethers.parseEther("100");
    const START_PRICE = ethers.parseEther("1");
    const END_PRICE = ethers.parseEther("0.1");
    const DURATION = 3600;
    
    beforeEach(async function () {
        [owner, seller, buyer] = await ethers.getSigners();
        
      
        const MockToken = await ethers.getContractFactory("MockERC20");
        token = await MockToken.deploy("AMAKA-TOKEN", "AMAKS");
        await token.deploymentTransaction()?.wait();
        
        
        await token.mint(seller.address, TOKEN_AMOUNT);
        
       
        const ReverseDutch = await ethers.getContractFactory("ReverseDutch", seller); // Connect with seller
        reverseDutch = await ReverseDutch.deploy(
            await token.getAddress(),
            TOKEN_AMOUNT,
            START_PRICE,
            END_PRICE,
            DURATION
        );
        await reverseDutch.deploymentTransaction()?.wait();
        
     
        await token.connect(seller).approve(await reverseDutch.getAddress(), TOKEN_AMOUNT);
    });

    describe("Auction Setup", function() {
        it("Should set correct initial values", async function() {
            expect(await reverseDutch.token()).to.equal(await token.getAddress());
            expect(await reverseDutch.tokenAmount()).to.equal(TOKEN_AMOUNT);
            expect(await reverseDutch.startPrice()).to.equal(START_PRICE);
            expect(await reverseDutch.endPrice()).to.equal(END_PRICE);
            expect(await reverseDutch.duration()).to.equal(DURATION);
            expect(await reverseDutch.seller()).to.equal(seller.address);
        });

        it("Should start auction with tokens", async function() {
            await reverseDutch.connect(seller).startAuction();
            expect(await token.balanceOf(await reverseDutch.getAddress())).to.equal(TOKEN_AMOUNT);
        });
    });

    describe("Purchase Mechanics", function() {
        beforeEach(async function() {
            await reverseDutch.connect(seller).startAuction();
        });

        it("Should transfer tokens to buyer and ETH to seller on purchase", async function() {
            await time.increase(1800);
            const currentPrice = await reverseDutch.getCurrentPrice();
            
            const initialBuyerBalance = await token.balanceOf(buyer.address);
            const initialSellerBalance = await ethers.provider.getBalance(seller.address);
            
            await reverseDutch.connect(buyer).purchase({ value: currentPrice });
            
            expect(await token.balanceOf(buyer.address))
                .to.equal(initialBuyerBalance + TOKEN_AMOUNT);
            expect(await ethers.provider.getBalance(seller.address))
                .to.be.gt(initialSellerBalance);
        });

        it("Should refund excess payment", async function() {
            const currentPrice = await reverseDutch.getCurrentPrice();
            const excess = ethers.parseEther("0.1");
            
            const initialBuyerBalance = await ethers.provider.getBalance(buyer.address);
            await reverseDutch.connect(buyer).purchase({ value: currentPrice + excess });
            
            const finalBuyerBalance = await ethers.provider.getBalance(buyer.address);
            expect(initialBuyerBalance - finalBuyerBalance).to.be.lt(currentPrice + excess);
        });
    });

    describe("Seller Controls", function() {
        it("Should allow seller to cancel auction", async function() {
            await reverseDutch.connect(seller).startAuction();
            await reverseDutch.connect(seller).cancelAuction();
            
            expect(await token.balanceOf(seller.address)).to.equal(TOKEN_AMOUNT);
            expect(await reverseDutch.isActive()).to.be.false;
        });

        it("Should not allow non-seller to cancel", async function() {
            await reverseDutch.connect(seller).startAuction();
            await expect(reverseDutch.connect(buyer).cancelAuction())
                .to.be.revertedWith("Only seller can cancel");
        });
    });
}); 