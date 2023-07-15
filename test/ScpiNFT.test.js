const { ethers } = require('hardhat');
const { expect, assert } = require('chai');

describe('Test ScpiNFT', function() {

    let owner, addr1, addr2, addr3, addr4, addrNotRegistered

    describe('Initialization', function() {

        beforeEach(async function() {
            [owner, addr1, addr2] = await ethers.getSigners()
            let contract = await ethers.getContractFactory('ScpiNFT')
            scpiNft = await contract.deploy()
        })

        it('should deploy the smart contract', async function() {
            let theOwner = await scpiNft.owner()
            assert.equal(owner.address, theOwner)
        })
    })

    describe('Minting', function() {
        beforeEach(async function() {
            [owner, addr1, addr2] = await ethers.getSigners()
            let contract = await ethers.getContractFactory('ScpiNFT')
            scpiNft = await contract.deploy()
        })

        it('shall register one company with expected number of items', async function() {
            const findEvent = await scpiNft.registerNewScpi(addr1.address,'SCPI 1',10000,'URI',99)

            // Check receiving registerNewScpi event
            await expect(findEvent)
            .to.emit(
                scpiNft, 
                'RegisterNewScpi'
            )
            .withArgs(
                1,
                'SCPI 1',
                99,
                'URI'
            )

            const balanceData = await scpiNft.balanceOf(addr1.address,1)
            expect(balanceData).to.equal(10000);            
        })

        it('shall register two companies with expected number of items and correct URI', async function() {
            var findEvent = await scpiNft.registerNewScpi(addr1.address,'SCPI 1',10000,'URI1',99)

            // Check receiving registerNewScpi event
            await expect(findEvent)
            .to.emit(
                scpiNft, 
                'RegisterNewScpi'
            )
            .withArgs(
                1,
                'SCPI 1',
                99,
                'URI1'
            )

            findEvent = await scpiNft.registerNewScpi(addr2.address,'SCPI 2',99999,'URI2',108)

            // Check receiving registerNewScpi event
            await expect(findEvent)
            .to.emit(
                scpiNft, 
                'RegisterNewScpi'
            )
            .withArgs(
                2,
                'SCPI 2',
                108,
                'URI2'
            )

            // Check balances
            var balanceData = await scpiNft.balanceOf(addr1.address,1)
            expect(balanceData).to.equal(10000)

            balanceData = await scpiNft.balanceOf(addr1.address,2)
            expect(balanceData).to.equal(0)

            balanceData = await scpiNft.balanceOf(addr2.address,1)
            expect(balanceData).to.equal(0)

            balanceData = await scpiNft.balanceOf(addr2.address,2)
            expect(balanceData).to.equal(99999)

            // Check URI
            var uriData = await scpiNft.uri(1)
            expect(uriData).to.equal('URI1')
            uriData = await scpiNft.uri(2)
            expect(uriData).to.equal('URI2')

        })

        it('shall not register a SCPI if not owner', async function() {
            await expect(scpiNft.connect(addr1).registerNewScpi(addr1.address,'SCPI 1',10000,'URI',99)).to.be.revertedWith('Ownable: caller is not the owner')
        })
    })

    describe('Update share price', function() {
        beforeEach(async function() {
            [owner, scpi1, scpi2, user1] = await ethers.getSigners()
            let contract = await ethers.getContractFactory('ScpiNFT')
            scpiNft = await contract.deploy()
            scpiNft.registerNewScpi(scpi1.address,'SCPI 1',5000,'URI',11)
            scpiNft.registerNewScpi(scpi2.address,'SCPI 2',10000,'URI',22)
        })

        it('SCPI shall be able to change its share price', async function() {
            findEvent = scpiNft.connect(scpi1).setPublicSharePrice(1,1000)
            // Check receiving registerNewScpi event
            await expect(findEvent)
            .to.emit(
                scpiNft, 
                'SetNewSharePrice'
            )
            .withArgs(
                1,
                1000
            )
        })

        it('Others shall not be able to change share price', async function() {
            await expect(scpiNft.connect(scpi2).setPublicSharePrice(1,1000)).to.be.revertedWith('Only SCPI owner is allowed to update share price')
            await expect(scpiNft.connect(scpi1).setPublicSharePrice(2,1000)).to.be.revertedWith('Only SCPI owner is allowed to update share price')
            await expect(scpiNft.connect(user1).setPublicSharePrice(1,1000)).to.be.revertedWith('Only SCPI owner is allowed to update share price')
        })
    })

    describe('Transfert tokens', function() {
        beforeEach(async function() {
            [owner, scpi1, marketplace, addr1, addr2] = await ethers.getSigners()
            let contract = await ethers.getContractFactory('ScpiNFT')
            scpiNft = await contract.deploy()

            await scpiNft.registerNewScpi(scpi1.address,'SCPI 1',10000,'URI',99)
        })

        it('SCPI shall be able to transfert tokens it owns', async function() {
            var balanceData = await scpiNft.balanceOf(scpi1.address,1)
            expect(balanceData).to.equal(10000)

            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,addr1.address,1,6000,ethers.ZeroHash)
            balanceData = await scpiNft.balanceOf(scpi1.address,1)
            expect(balanceData).to.equal(4000)
            balanceData = await scpiNft.balanceOf(addr1.address,1)
            expect(balanceData).to.equal(6000)
        })

        it('SCPI shall not be able to transfert tokens from others', async function() {
            var balanceData = await scpiNft.balanceOf(scpi1.address,1)
            expect(balanceData).to.equal(10000)

            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,addr1.address,1,50,ethers.ZeroHash)
            await expect(scpiNft.connect(scpi1).safeTransferFrom(addr1.address,addr2.address,1,50,ethers.ZeroHash)).to.be.revertedWith('Please use Marketplace to sell your shares')
        })

        it('Marketplace shall be able to transfert tokens from one wallet to another', async function() {
            await expect(scpiNft.connect(addr1).setMarketplaceAddress(marketplace.address)).to.be.revertedWith('Ownable: caller is not the owner')
            await scpiNft.setMarketplaceAddress(marketplace.address)
            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,addr1.address,1,6000,ethers.ZeroHash)
            await scpiNft.connect(marketplace).safeTransferFrom(addr1.address,addr2.address,1,5000,ethers.ZeroHash)
            var balanceData = await scpiNft.balanceOf(addr1.address,1)
            expect(balanceData).to.equal(1000)
            balanceData = await scpiNft.balanceOf(addr2.address,1)
            expect(balanceData).to.equal(5000)
        })

        it('Users shall not be able to transfert tokens directly', async function() {
            var balanceData = await scpiNft.balanceOf(scpi1.address,1)
            expect(balanceData).to.equal(10000)

            await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,addr1.address,1,50,ethers.ZeroHash)
            await expect(scpiNft.connect(addr1).safeTransferFrom(addr1.address,addr2.address,1,50,ethers.ZeroHash)).to.be.revertedWith('Please use Marketplace to sell your shares')
        })

        it('safeBatchTransferFrom use is not allowed', async function() {
            await expect(scpiNft.connect(scpi1).safeBatchTransferFrom(scpi1.address,addr1.address,[1],[50],ethers.ZeroHash)).to.be.revertedWith('safeBatchTransferFrom not allowed')
        })

    })
})