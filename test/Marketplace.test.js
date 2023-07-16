const { ethers } = require('hardhat');
const { expect, assert } = require('chai');

describe('Test Marketplace', function() {

    let owner, addr1, addr2, addr3, addr4, addrNotRegistered

    describe('Initialization', function() {

        beforeEach(async function() {
            [owner, addr1, addr2] = await ethers.getSigners()
            let contract = await ethers.getContractFactory('ScpiNFT')
            scpiNft = await contract.deploy()
            await scpiNft.waitForDeployment()
            contract = await ethers.getContractFactory('Marketplace')
            marketplace = await contract.deploy(scpiNft.target)
            await scpiNft.setMarketplaceAddress(marketplace.target)
        })

        it('should deploy the smart contracts', async function() {
            let theOwner = await scpiNft.owner()
            assert.equal(owner.address, theOwner)
            theOwner = await scpiNft.owner()
            assert.equal(owner.address, theOwner)
        })
    })

    describe('Set SCPI NFT for sale', function() {
        beforeEach(async function() {
            [owner, scpi1, user1, user2] = await ethers.getSigners()
            let contract = await ethers.getContractFactory('ScpiNFT')
            scpiNft = await contract.deploy()
            await scpiNft.waitForDeployment()
            contract = await ethers.getContractFactory('Marketplace')
            marketplace = await contract.deploy(scpiNft.target)
            await scpiNft.setMarketplaceAddress(marketplace.target)
            // Mint one NFT
            await scpiNft.registerNewScpi(scpi1.address,'SCPI 1',10000,'URI',99)
            // Send some NFT to user1
            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user1.address,1,6000,ethers.ZeroHash)
        })

        it('shall allow user1 to set his NFTs for sale on marketplace', async function() {
            let userOrder = await marketplace.connect(user1).getOrderByAddress(1,user1.address)
            expect(userOrder.listedBy).to.equal(ethers.ZeroAddress);
            expect(userOrder.quantity).to.equal(0);
            expect(userOrder.unitPrice).to.equal(0);

            const findEvent = await marketplace.connect(user1).createSellOrder(1,99,6000)
            // Check receiving ListedForSale event
            await expect(findEvent)
            .to.emit(
                marketplace, 
                'ListedForSale'
            )
            .withArgs(
                user1.address,
                1,
                6000,
                99
            )

            // Check all orders
            const allOrders = await marketplace.connect(user1).getOrders(1)
            expect(allOrders.length).to.equal(1);
            expect(allOrders[0].listedBy).to.equal(user1.address);
            expect(allOrders[0].quantity).to.equal(6000);
            expect(allOrders[0].unitPrice).to.equal(99);

            // Check order for user1
            userOrder = await marketplace.connect(user1).getOrderByAddress(1,user1.address)
            expect(userOrder.listedBy).to.equal(user1.address);
            expect(userOrder.quantity).to.equal(6000);
            expect(userOrder.unitPrice).to.equal(99);
        })

        it('shall not allow user1 to sell more NFTs than owned', async function() {
            await expect(marketplace.connect(user1).createSellOrder(1,99,6001)).to.be.revertedWith('Marketplace: Insufficient token balance')
        })

        it('shall not allow to sell NFTs for a price of 0', async function() {
            await expect(marketplace.connect(user1).createSellOrder(1,0,60)).to.be.revertedWith('Marketplace: Price must be greater than 0')
        })

        it('shall not allow the same user to set 2 different sell orders (this will change)', async function() {
            await marketplace.connect(user1).createSellOrder(1,99,1000)
            await expect(marketplace.connect(user1).createSellOrder(1,99,1000)).to.be.revertedWith('Marketplace: Token is already listed for sale by the given owner')
        })
    })

    describe('Cancel SCPI NFT sale', function() {
        beforeEach(async function() {
            [owner, scpi1, user1, user2] = await ethers.getSigners()
            let contract = await ethers.getContractFactory('ScpiNFT')
            scpiNft = await contract.deploy()
            await scpiNft.waitForDeployment()
            contract = await ethers.getContractFactory('Marketplace')
            marketplace = await contract.deploy(scpiNft.target)
            await scpiNft.setMarketplaceAddress(marketplace.target)
            // Mint one NFT
            await scpiNft.registerNewScpi(scpi1.address,'SCPI 1',10000,'URI',99)
            // Send some NFT to user1
            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user1.address,1,6000,ethers.ZeroHash)
        })

        it('shall allow user1 to cancel a sale order', async function() {
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(1,99,5000)

            // Check order for user1
            let userOrder = await marketplace.connect(user1).getOrderByAddress(1,user1.address)
            expect(userOrder.listedBy).to.equal(user1.address);
            expect(userOrder.quantity).to.equal(5000);
            expect(userOrder.unitPrice).to.equal(99);

            // Cancel order
            const findEvent = await marketplace.connect(user1).cancelSellOrder(1)
            // Check receiving UnlistedFromSale event
            await expect(findEvent)
            .to.emit(
                marketplace, 
                'UnlistedFromSale'
            )
            .withArgs(
                user1.address,
                1
            )

            // Check that there is no order pending
            userOrder = await marketplace.connect(user1).getOrderByAddress(1,user1.address)
            expect(userOrder.listedBy).to.equal(ethers.ZeroAddress);
            expect(userOrder.quantity).to.equal(0);
            expect(userOrder.unitPrice).to.equal(0);
        })

        it('shall not allow user1 to cancel orders if no order pending', async function() {
            await expect(marketplace.connect(user1).cancelSellOrder(1)).to.be.revertedWith('Marketplace: Given token is not listed for sale by the owner')
        })

        it('shall allow user to create a sell order after previous one has been cancelled', async function() {
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(1,99,5000)

            // Cancel order
            await marketplace.connect(user1).cancelSellOrder(1)

            let userOrder = await marketplace.connect(user1).getOrderByAddress(1,user1.address)
            expect(userOrder.listedBy).to.equal(ethers.ZeroAddress);
            expect(userOrder.quantity).to.equal(0);
            expect(userOrder.unitPrice).to.equal(0);

            const findEvent = await marketplace.connect(user1).createSellOrder(1,99,6000)
            // Check receiving ListedForSale event
            await expect(findEvent)
            .to.emit(
                marketplace, 
                'ListedForSale'
            )
            .withArgs(
                user1.address,
                1,
                6000,
                99
            )

            // Check order for user1
            userOrder = await marketplace.connect(user1).getOrderByAddress(1,user1.address)
            expect(userOrder.listedBy).to.equal(user1.address);
            expect(userOrder.quantity).to.equal(6000);
            expect(userOrder.unitPrice).to.equal(99);
        })
    })
})