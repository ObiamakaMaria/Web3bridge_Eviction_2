//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ReverseDutch is ReentrancyGuard {
    IERC20 public token;
    address public seller;
    uint256 public tokenAmount;
    uint256 public startPrice;
    uint256 public endPrice;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public duration;
    bool public isActive;
    bool public isSold;
    
    event AuctionStarted(uint256 startPrice, uint256 endPrice, uint256 duration);
    event TokensPurchased(address buyer, uint256 amount, uint256 price);
    
    constructor(
        address _token,
        uint256 _tokenAmount,
        uint256 _startPrice,
        uint256 _endPrice,
        uint256 _duration
    ) {
        require(_token != address(0), "Invalid token address");
        require(_tokenAmount > 0, "Token amount must be greater than 0");
        require(_startPrice > _endPrice, "Start price must be greater than end price");
        require(_duration > 0, "Duration must be greater than 0");
        
        token = IERC20(_token);
        tokenAmount = _tokenAmount;
        startPrice = _startPrice;
        endPrice = _endPrice;
        duration = _duration;
        seller = msg.sender;
        isActive = false;
        isSold = false;
    }
    
    function startAuction() external {
        require(msg.sender == seller, "Only seller can start auction");
        require(!isActive, "Auction already started");
        require(
            token.allowance(seller, address(this)) >= tokenAmount,
            "Insufficient token allowance"
        );
        
        token.transferFrom(seller, address(this), tokenAmount);
        startTime = block.timestamp;
        endTime = startTime + duration;
        isActive = true;
        
        emit AuctionStarted(startPrice, endPrice, duration);
    }
    
    function getCurrentPrice() public view returns (uint256) {
        if (!isActive || isSold) return startPrice;
        if (block.timestamp >= endTime) return endPrice;
        
        uint256 elapsed = block.timestamp - startTime;
        uint256 priceDrop = ((startPrice - endPrice) * elapsed) / duration;
        return startPrice - priceDrop;
    }
    
    function purchase() external payable nonReentrant {
        require(isActive, "Auction not active");
        require(!isSold, "Auction already completed");
        
        uint256 currentPrice = getCurrentPrice();
        require(msg.value >= currentPrice, "Insufficient payment");
        
        isSold = true;
        token.transfer(msg.sender, tokenAmount);
        
     
        if (msg.value > currentPrice) {
            payable(msg.sender).transfer(msg.value - currentPrice);
        }
        
      
        payable(seller).transfer(currentPrice);
        
        emit TokensPurchased(msg.sender, tokenAmount, currentPrice);
    }
    
    function cancelAuction() external {
        require(msg.sender == seller, "Only seller can cancel");
        require(isActive, "Auction not active");
        require(!isSold, "Auction already completed");
        
        isActive = false;
        token.transfer(seller, tokenAmount);
    }
}
    