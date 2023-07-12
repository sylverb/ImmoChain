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
})