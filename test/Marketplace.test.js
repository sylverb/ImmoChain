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
            let userOrder = await marketplace.connect(user1).getOrdersByAddress(1,user1.address)
            expect(userOrder.length).to.equal(0)

            const findEvent = await marketplace.connect(user1).createSellOrder(1,85,6000)
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
                85
            )

            // Check all orders
            const allOrders = await marketplace.connect(user1).getOrderCountByPrice(1)
            expect(allOrders.length).to.equal(1)
            expect(allOrders[0].price).to.equal(85)
            expect(allOrders[0].total).to.equal(6000)

            // Check orders for user1
            userOrder = await marketplace.connect(user1).getOrdersByAddress(1,user1.address)
            expect(userOrder[0].seller).to.equal(user1.address)
            expect(userOrder[0].quantity).to.equal(6000)
            expect(userOrder[0].unitPrice).to.equal(85)
        })

        it('shall not allow user1 to sell more NFTs than owned', async function() {
            await expect(marketplace.connect(user1).createSellOrder(1,100,6001)).to.be.revertedWith('Marketplace: Insufficient token balance')
        })

        it('Marketplace: price is a % between 30 and 100% with a 5 points step', async function() {
            let quantity = 60
            await expect(marketplace.connect(user1).createSellOrder(1,86,quantity)).to.be.revertedWith('Marketplace: price is a % between 30 and 100% with a 5 points step')
            await expect(marketplace.connect(user1).createSellOrder(1,0,quantity)).to.be.revertedWith('Marketplace: price is a % between 30 and 100% with a 5 points step')
            await expect(marketplace.connect(user1).createSellOrder(1,25,quantity)).to.be.revertedWith('Marketplace: price is a % between 30 and 100% with a 5 points step')
            await expect(marketplace.connect(user1).createSellOrder(1,105,quantity)).to.be.revertedWith('Marketplace: price is a % between 30 and 100% with a 5 points step')
        })

        it('shall allow the same user to set 2 different sell orders', async function() {
            await marketplace.connect(user1).createSellOrder(1,85,1000)
            await marketplace.connect(user1).createSellOrder(1,75,1000)
        })

        it('shall not allow an user to sell more token than owned by creating several sell orders', async function() {
            await marketplace.connect(user1).createSellOrder(1,85,1000)
            await expect(marketplace.connect(user1).createSellOrder(1,75,6000)).to.be.revertedWith('Marketplace: Insufficient token balance')
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
            // Send some NFT to user2
            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user2.address,1,1000,ethers.ZeroHash)
        })

        it('shall allow user1 to cancel a sale order', async function() {
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(1,95,5000)

            // Check order for user1
            let userOrder = await marketplace.connect(user1).getOrdersByAddress(1,user1.address)
            expect(userOrder[0].seller).to.equal(user1.address)
            expect(userOrder[0].quantity).to.equal(5000)
            expect(userOrder[0].unitPrice).to.equal(95)

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
            userOrder = await marketplace.connect(user1).getOrdersByAddress(1,user1.address)
            expect(userOrder.length).to.equal(0)
        })

        it('shall allow users to create several orders and cancel them', async function() {
            // Create 2 sell order
            await marketplace.connect(user1).createSellOrder(1,95,1000)
            await marketplace.connect(user1).createSellOrder(1,90,100)
            await marketplace.connect(user1).createSellOrder(1,90,100)
            await marketplace.connect(user2).createSellOrder(1,90,100)

            // Check order for user1
            let userOrder = await marketplace.connect(user1).getOrdersByAddress(1,user1.address)
            expect(userOrder[0].seller).to.equal(user1.address)
            expect(userOrder[0].quantity).to.equal(1000)
            expect(userOrder[0].unitPrice).to.equal(95)
            expect(userOrder[1].seller).to.equal(user1.address)
            expect(userOrder[1].quantity).to.equal(100)
            expect(userOrder[1].unitPrice).to.equal(90)

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

            // Cancel 2nd and 3rd orders
            await marketplace.connect(user2).cancelSellOrder(1)
            await marketplace.connect(user1).cancelSellOrder(1)
            await marketplace.connect(user1).cancelSellOrder(1)

            // Check that there is no order pending
            userOrder = await marketplace.connect(user1).getOrdersByAddress(1,user1.address)
            expect(userOrder.length).to.equal(0)
        })

        it('shall not allow user1 to cancel orders if no order pending', async function() {
            await expect(marketplace.connect(user1).cancelSellOrder(1)).to.be.revertedWith('Marketplace: Given token is not listed for sale by the owner')
        })

        it('shall allow user to create a sell order after previous one has been cancelled', async function() {
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(1,95,5000)

            // Cancel order
            await marketplace.connect(user1).cancelSellOrder(1)

            // Check that there is no order pending
            let userOrder = await marketplace.connect(user1).getOrdersByAddress(1,user1.address)
            expect(userOrder.length).to.equal(0)

            const findEvent = await marketplace.connect(user1).createSellOrder(1,100,6000)
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
                100
            )

            // Check order for user1
            userOrder = await marketplace.connect(user1).getOrdersByAddress(1,user1.address)
            expect(userOrder[0].seller).to.equal(user1.address)
            expect(userOrder[0].quantity).to.equal(6000)
            expect(userOrder[0].unitPrice).to.equal(100)
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

        it('shall allow user2 to buy some shares sold by user1 and user 1 shall withdraw', async function() {
            scpiId = 1
            const unitPrice = 100
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice,5000)

            initialMarketplaceBalance = await ethers.provider.getBalance(marketplace)

            // user 2 create a buy order
            const buyingSharesAmount = 15
            const paidAmount = (buyingSharesAmount*unitPrice*publicPrice)/100
            const findEvent = await marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,{
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
            userOrder = await marketplace.connect(user1).getOrdersByAddress(scpiId,user1.address)
            expect(userOrder[0].seller).to.equal(user1.address)
            expect(userOrder[0].quantity).to.equal(5000-15)
            expect(userOrder[0].unitPrice).to.equal(unitPrice)

            // Check eth balance for marketplace
            const newMarketplaceBalance = await ethers.provider.getBalance(marketplace)
            expect(newMarketplaceBalance).to.equal(initialMarketplaceBalance+ethers.parseEther(paidAmount.toString()))

            // Check user balance on marketplace
            let marketBalance = await marketplace.connect(user1).getBalanceInfo()
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

        it('shall allow user2 to buy all shares sold by user1', async function() {
            scpiId = 1
            const unitPrice = 95
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice,5000)

            // user 2 create a buy order
            const buyingSharesAmount = 5000
            const paidAmount = (buyingSharesAmount*unitPrice*publicPrice)/100
            const findEvent = await marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,{
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

            // Check that there are no orders existing for the seller
            const userOrders = await marketplace.connect(user1).getOrdersByAddress(scpiId,user1.address)
            expect(userOrders.length).to.equal(0)
        })

        it('shall allow user2 to buy all shares sold by user1 (several orders)', async function() {
            scpiId = 1
            const unitPrice = 95

            // Create 2 sell order
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice,50)
            await marketplace.connect(user1).createSellOrder(scpiId,100,2)

            // user 2 create a buy order
            const buyingSharesAmount = 51
            const paidAmount = (50*unitPrice*publicPrice)/100+1*publicPrice
            const findEvent = await marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,{
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
                50,
                ethers.parseEther(((50*unitPrice*publicPrice)/100).toString())
            )

            // Check new NFT balance of user1 & 2
            let balanceData = await scpiNft.balanceOf(user1.address,scpiId)
            expect(balanceData).to.equal(6000-buyingSharesAmount)
            balanceData = await scpiNft.balanceOf(user2.address,scpiId)
            expect(balanceData).to.equal(buyingSharesAmount)

            // Check that there one order existing for the seller
            userOrders = await marketplace.connect(user1).getOrdersByAddress(scpiId,user1.address)
            expect(userOrders.length).to.equal(1)
            expect(userOrders[0].seller).to.equal(user1.address)
            expect(userOrders[0].quantity).to.equal(1)
            expect(userOrders[0].unitPrice).to.equal(100)
        })

        it('shall reject if user2 does not pay enough', async function() {
            scpiId = 1
            const unitPrice = 65
            // Create a sell order
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice,5000)

            // user 2 create a buy order
            const buyingSharesAmount = 5000
            const paidAmount = (buyingSharesAmount*unitPrice*publicPrice)/100 - 1 // -1 to pay less than expected
            await expect(marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,{
                value: paidAmount
              })).to.be.revertedWith('Marketplace: Less ETH provided for the purchase')
        })

        it('shall reject if user2 try to buy more shares than available on the marketplace', async function() {
            scpiId = 1
            const unitPrice = 30

            // user 2 create a buy order
            const buyingSharesAmount = 5000
            const paidAmount = (buyingSharesAmount*unitPrice*publicPrice)/100-1 // -1 to pay less than expected
            await expect(marketplace.connect(user2).createBuyOrder(scpiId,buyingSharesAmount,{
                value: paidAmount
              })).to.be.revertedWith('Marketplace: Not enough shares in sale to fill the buy order')
        })
    })

    describe('Buy ordering of SCPI shares', function() {
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
            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user1.address,1,1000,ethers.ZeroHash)
            // Send some shares to user2
            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user2.address,1,1000,ethers.ZeroHash)
        })

        it('shall buy cheaper shares first', async function() {
            scpiId = 1
            const unitPrice100 = 100
            const unitPrice50 = 50
            // Create sell orders
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice100,3)
            await marketplace.connect(user2).createSellOrder(scpiId,unitPrice50,5)

            initialMarketplaceBalance = await ethers.provider.getBalance(marketplace)

            // user 3 create a buy order
            const buyingSharesAmount = 3
            const paidAmount = (buyingSharesAmount*unitPrice50) / 100 * publicPrice
            const findEvent = await marketplace.connect(user3).createBuyOrder(scpiId,buyingSharesAmount,{
                value: ethers.parseEther(paidAmount.toString())
            })

            // Check receiving ListedForSale event
            await expect(findEvent)
            .to.emit(
                marketplace, 
                'TokensSold'
            )
            .withArgs(
                user2.address,
                user3.address,
                scpiId,
                buyingSharesAmount,
                ethers.parseEther(paidAmount.toString())
            )
        })

        it('shall buy from different prices to fill request', async function() {
            scpiId = 1
            const unitPrice100 = 100
            const unitPrice50 = 50
            // Create sell orders
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice100,3)
            await marketplace.connect(user2).createSellOrder(scpiId,unitPrice50,5)

            initialMarketplaceBalance = await ethers.provider.getBalance(marketplace)

            // user 3 create a buy order
            const buyingSharesAmount = 8
            const paidAmount = (5*unitPrice50) / 100 * publicPrice + (3*unitPrice100) / 100 * publicPrice
            const findEvent = await marketplace.connect(user3).createBuyOrder(scpiId,buyingSharesAmount,{
                value: ethers.parseEther(paidAmount.toString())
            })

            // Check receiving ListedForSale event
            await expect(findEvent)
            .to.emit(
                marketplace, 
                'TokensSold'
            )
            .withArgs(
                user2.address,
                user3.address,
                scpiId,
                5,
                ethers.parseEther(((5*unitPrice50) / 100 * publicPrice).toString())
            )

            await expect(findEvent)
            .to.emit(
                marketplace, 
                'TokensSold'
            )
            .withArgs(
                user1.address,
                user3.address,
                scpiId,
                3,
                ethers.parseEther(((3*unitPrice100) / 100 * publicPrice).toString())
            )
        })

        it('The number of shares for sale on the marketplace shall be 0 once we bought them all', async function() {
            scpiId = 1
            const unitPrice100 = 100
            const unitPrice50 = 50
            // Create sell orders
            await marketplace.connect(user1).createSellOrder(scpiId,unitPrice100,3)
            await marketplace.connect(user2).createSellOrder(scpiId,unitPrice50,5)

            initialMarketplaceBalance = await ethers.provider.getBalance(marketplace)

            // user 3 create a buy order
            const buyingSharesAmount = 8
            const paidAmount = (5*unitPrice50) / 100 * publicPrice + (3*unitPrice100) / 100 * publicPrice
            const findEvent = await marketplace.connect(user3).createBuyOrder(scpiId,buyingSharesAmount,{
                value: ethers.parseEther(paidAmount.toString())
            })

            await expect(marketplace.connect(user3).createBuyOrder(scpiId,1,{
                value: ethers.parseEther(paidAmount.toString())
              })).to.be.revertedWith('Marketplace: Not enough shares in sale to fill the buy order')
        })
    })

    describe('Large sales numbers', function() {
        beforeEach(async function() {
            [owner, scpi1, user1, user2, user3] = await ethers.getSigners()
            let contract = await ethers.getContractFactory('ScpiNFT')
            scpiNft = await contract.deploy()
            await scpiNft.waitForDeployment()
            contract = await ethers.getContractFactory('Marketplace')
            marketplace = await contract.deploy(scpiNft.target)
            await scpiNft.setMarketplaceAddress(marketplace.target)
            publicPrice = 0.01
            // Mint one SCPI
            await scpiNft.registerNewScpi(scpi1.address,'SCPI 1',10000,'URI',ethers.parseEther(publicPrice.toString()))
            // Send some shares to user1
            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user1.address,1,5000,ethers.ZeroHash)
            // Send some shares to user2
            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user2.address,1,5000,ethers.ZeroHash)
        })

        it('shall be able to buy with a lot of sell orders present', async function() {
            scpiId = 1
            const unitPrice100 = 100
            const unitPrice50 = 50
            for (i = 0; i < 5; i++) {
//                console.log("i = "+i)
                // Create sell orders
                await marketplace.connect(user1).createSellOrder(scpiId,unitPrice100,1)
                await marketplace.connect(user2).createSellOrder(scpiId,unitPrice50,1)
                await marketplace.connect(user1).createSellOrder(scpiId,unitPrice50,1)
                await marketplace.connect(user2).createSellOrder(scpiId,unitPrice100,1)
            }
            initialMarketplaceBalance = await ethers.provider.getBalance(marketplace)

            // user 3 create a buy order
            const buyingSharesAmount = 2
            const paidAmount = (buyingSharesAmount*unitPrice50) / 100 * publicPrice
            const tx = await marketplace.connect(user3).createBuyOrder(scpiId,buyingSharesAmount,{
                value: ethers.parseEther(paidAmount.toString())
            })

            // Check receiving ListedForSale event
            await expect(tx)
            .to.emit(
                marketplace, 
                'TokensSold'
            )
            .withArgs(
                user2.address,
                user3.address,
                scpiId,
                1,
                ethers.parseEther(((unitPrice50) / 100 * publicPrice).toString())
            )

            await expect(tx)
            .to.emit(
                marketplace, 
                'TokensSold'
            )
            .withArgs(
                user1.address,
                user3.address,
                scpiId,
                1,
                ethers.parseEther(((unitPrice50) / 100 * publicPrice).toString())
            )
        })
    })
})