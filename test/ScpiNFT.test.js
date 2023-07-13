const { ethers } = require('hardhat');
const { expect, assert } = require('chai');

describe("Test ScpiNFT", function() {

    let owner, addr1, addr2, addr3, addr4, addrNotRegistered

    describe("Initialization", function() {

        beforeEach(async function() {
            [owner, addr1, addr2] = await ethers.getSigners()
            let contract = await ethers.getContractFactory("ScpiNFT")
            scpiNft = await contract.deploy()
        })

        it('should deploy the smart contract', async function() {
            let theOwner = await scpiNft.owner()
            assert.equal(owner.address, theOwner)
        })
    })

    describe("Minting", function() {
        beforeEach(async function() {
            [owner, addr1, addr2] = await ethers.getSigners()
            let contract = await ethers.getContractFactory("ScpiNFT")
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
                1
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
                1
            )

            findEvent = await scpiNft.registerNewScpi(addr2.address,'SCPI 2',99999,'URI2',108)

            // Check receiving registerNewScpi event
            await expect(findEvent)
            .to.emit(
                scpiNft, 
                'RegisterNewScpi'
            )
            .withArgs(
                2
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
    })
})