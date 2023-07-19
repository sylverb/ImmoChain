const { ethers } = require('hardhat')
const { expect, assert } = require('chai')

describe('Test Marketplace', function() {

    let owner, addr1, addr2, addr3, addr4, addrNotRegistered
    let publicPrice

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
            expect(userOrder.listedBy).to.equal(ethers.ZeroAddress)
            expect(userOrder.quantity).to.equal(0)
            expect(userOrder.unitPrice).to.equal(0)

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
            expect(allOrders.length).to.equal(1)
            expect(allOrders[0].listedBy).to.equal(user1.address)
            expect(allOrders[0].quantity).to.equal(6000)
            expect(allOrders[0].unitPrice).to.equal(99)

            // Check order for user1
            userOrder = await marketplace.connect(user1).getOrderByAddress(1,user1.address)
            expect(userOrder.listedBy).to.equal(user1.address)
            expect(userOrder.quantity).to.equal(6000)
            expect(userOrder.unitPrice).to.equal(99)
        })

        it('shall not allow user1 to sell more NFTs than owned', async function() {
            await expect(marketplace.connect(user1).createSellOrder(1,100,6001)).to.be.revertedWith('Marketplace: Insufficient token balance')
        })

        it('Marketplace: price is a % and can\'t be lower than 30', async function() {
            await expect(marketplace.connect(user1).createSellOrder(1,0,60)).to.be.revertedWith('Marketplace: price is a % and can\'t be lower than 30')
            await expect(marketplace.connect(user1).createSellOrder(1,29,60)).to.be.revertedWith('Marketplace: price is a % and can\'t be lower than 30')
            await expect(marketplace.connect(user1).createSellOrder(1,101,60)).to.be.revertedWith('Marketplace: price is a % and can\'t be lower than 30')
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
            expect(userOrder.listedBy).to.equal(user1.address)
            expect(userOrder.quantity).to.equal(5000)
            expect(userOrder.unitPrice).to.equal(99)

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
            expect(userOrder.listedBy).to.equal(ethers.ZeroAddress)
            expect(userOrder.quantity).to.equal(0)
            expect(userOrder.unitPrice).to.equal(0)
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
            expect(userOrder.listedBy).to.equal(ethers.ZeroAddress)
            expect(userOrder.quantity).to.equal(0)
            expect(userOrder.unitPrice).to.equal(0)

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
            expect(userOrder.listedBy).to.equal(user1.address)
            expect(userOrder.quantity).to.equal(6000)
            expect(userOrder.unitPrice).to.equal(99)
        })
    })
    describe('Buy SCPI shares', function() {
        beforeEach(async function() {
            [owner, scpi1, user1, user2, user3] = await ethers.getSigners()
            let contract = await ethers.getContractFactory('ScpiNFT')
            scpiNft = await contract.deploy()
            await scpiNft.waitForDeployment()
            contract = await ethers.getContractFactory('Marketplace')
            marketplace = await contract.deploy(scpiNft.target)
            await scpiNft.setMarketplaceAddress(marketplace.target)
            publicPrice = 2
            // Mint one SCPI
            await scpiNft.registerNewScpi(scpi1.address,'SCPI 1',10000,'URI',ethers.parseEther(publicPrice.toString()))
            // Send some shares to user1
            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user1.address,1,6000,ethers.ZeroHash)
        })

        it('shall allow user2 to buy some shared sold by user1 and user 1 shall withdraw', async function() {
            scpiId = 1
            const unitPrice = 100
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice,5000)

            initialMarketplaceBalance = await ethers.provider.getBalance(marketplace)

            // user 2 create a buy order
            const buyingSharesAmount = 15
            const paidAmount = (buyingSharesAmount*unitPrice*publicPrice)/100
            const findEvent = await marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,user1.address,{
                value: ethers.parseEther(paidAmount.toString())
              })

            // Check receiving ListedForSale event
            await expect(findEvent)
            .to.emit(
                marketplace, 
                'TokensSold'
            )
            .withArgs(
                user1.address,
                user2.address,
                scpiId,
                15,
                ethers.parseEther(paidAmount.toString())
            )

            // Check new shares balance of user1 & 2
            let balanceData = await scpiNft.balanceOf(user1.address,scpiId)
            expect(balanceData).to.equal(6000-15)
            balanceData = await scpiNft.balanceOf(user2.address,scpiId)
            expect(balanceData).to.equal(15)

            // Check order for user1
            userOrder = await marketplace.connect(user1).getOrderByAddress(scpiId,user1.address)
            expect(userOrder.listedBy).to.equal(user1.address)
            expect(userOrder.quantity).to.equal(5000-15)
            expect(userOrder.unitPrice).to.equal(unitPrice)

            // Check eth balance for marketplace
            const newMarketplaceBalance = await ethers.provider.getBalance(marketplace)
            expect(newMarketplaceBalance).to.equal(initialMarketplaceBalance+ethers.parseEther(paidAmount.toString()))

            // Check user balance on marketplace
            let marketBalance = await marketplace.connect(user1).getFundsInfo()
            expect(marketBalance).to.equal(initialMarketplaceBalance+ethers.parseEther(paidAmount.toString()))

            // Allow user1 to withdraw his funds
            const initialBalance = await ethers.provider.getBalance(user1)
            let response = await marketplace.connect(user1).withdrawFunds()
            let receipt = await response.wait()
            let usedGas = receipt.gasUsed
            let gasPriceInWei = response.gasPrice
            const newBalance = await ethers.provider.getBalance(user1)
            expect(newBalance).to.equal(initialBalance+ethers.parseEther(paidAmount.toString())-usedGas*gasPriceInWei)
        })

        it('shall allow user2 to buy all shared sold by user1', async function() {
            scpiId = 1
            const unitPrice = 99
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice,5000)

            // user 2 create a buy order
            const buyingSharesAmount = 5000
            const paidAmount = (buyingSharesAmount*unitPrice*publicPrice)/100
            const findEvent = await marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,user1.address,{
                value: ethers.parseEther(paidAmount.toString())
              })

            // Check receiving ListedForSale event
            await expect(findEvent)
            .to.emit(
                marketplace, 
                'TokensSold'
            )
            .withArgs(
                user1.address,
                user2.address,
                scpiId,
                buyingSharesAmount,
                ethers.parseEther(paidAmount.toString())
            )

            // Check new NFT balance of user1 & 2
            let balanceData = await scpiNft.balanceOf(user1.address,scpiId)
            expect(balanceData).to.equal(6000-buyingSharesAmount)
            balanceData = await scpiNft.balanceOf(user2.address,scpiId)
            expect(balanceData).to.equal(buyingSharesAmount)

            // Check that there are no orders existing anymore
            const allOrders = await marketplace.connect(user1).getOrders(1)
            expect(allOrders.length).to.equal(0)
        })

        it('shall reject if user2 does not pay enough', async function() {
            scpiId = 1
            const unitPrice = 99
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice,5000)

            // user 2 create a buy order
            const buyingSharesAmount = 5000
            const paidAmount = (buyingSharesAmount*unitPrice*publicPrice)/100 - 1 // -1 to pay less than expected
            await expect(marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,user1.address,{
                value: paidAmount
              })).to.be.revertedWith('Marketplace: Less ETH provided for the purchase')
        })

        it('shall reject if user2 try to by tokens from not existing sell order', async function() {
            scpiId = 1
            const unitPrice = 99

            // user 2 create a buy order
            const buyingSharesAmount = 5000
            const paidAmount = (buyingSharesAmount*unitPrice*publicPrice)/100-1 // -1 to pay less than expected
            await expect(marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,user1.address,{
                value: paidAmount
              })).to.be.revertedWith('Marketplace: Given token is not listed for sale by the owner')
        })

        it('shall reject if user2 tries to buy more shared then sold by user1', async function() {
            scpiId = 1
            const unitPrice = 99
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice,10)

            // user 2 create a buy order
            const buyingSharesAmount = 11
            const paidAmount = (buyingSharesAmount*unitPrice*publicPrice)/100
            await expect(marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,user1.address,{
                value: ethers.parseEther(paidAmount.toString())
              })).to.be.revertedWith('Marketplace: Attempting to buy more than available for sale')
        })
    })
})