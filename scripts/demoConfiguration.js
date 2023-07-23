// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.

// This script is to set an initial configuration on local testnet for demonstration purposes
// It requires that smart contracts have aleady been deployed and configured
const hre = require("hardhat");

async function main() {
  [owner, scpi1, scpi2, scpi3, user1, user2, user3] = await ethers.getSigners()
  const scpiNftAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const marketplaceAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
  const scpi1Id = 1
  const scpi2Id = 2

  const scpiNft = await hre.ethers.getContractAt("ScpiNFT",scpiNftAddress);
  const marketplace = await hre.ethers.getContractAt("Marketplace",marketplaceAddress);

  console.log('Register Bonaparte Immobilier (SCPI1)')
  let transaction = await scpiNft.registerNewScpi(scpi1.address,'Bonaparte Immobilier',10000,'https://blog.napoleon-cologne.fr/wp-content/uploads/2021/04/bicentenaire-napoleon-bonaparte-mort.jpg',ethers.parseEther('2'));
  await transaction.wait()

  console.log('SCPI1 send 15 shares to user 1, 30 shares to user 2, 50 shares to user 3')
  transaction = await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user1.address,scpi1Id,15,ethers.ZeroHash)
  await transaction.wait()
  transaction = await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user2.address,scpi1Id,30,ethers.ZeroHash)
  await transaction.wait()
  transaction = await scpiNft.connect(scpi1).safeTransferFrom(scpi1.address,user3.address,scpi1Id,50,ethers.ZeroHash)
  await transaction.wait()


  console.log('Register Beuffeuil Immobilier (SCPI2)')
  transaction = await scpiNft.registerNewScpi(scpi2.address,'Beuffeuil Immobilier',5000,'https://www.google.fr/logos/doodles/2023/bastille-day-2023-6753651837110057.3-l.webp',ethers.parseEther('1'));
  await transaction.wait()

  console.log('SCPI2 send 150 shares to user 2')
  transaction = await scpiNft.connect(scpi2).safeTransferFrom(scpi2.address,user2.address,scpi2Id,150,ethers.ZeroHash)
  await transaction.wait()


  console.log('user1 wants to sell 2 shares from SCPI1')
  transaction = await marketplace.connect(user1).createSellOrder(scpi1Id,100,2)
  await transaction.wait()

  console.log('user3 wants to sell 10 shares from SCPI1 50% off')
  transaction = await marketplace.connect(user3).createSellOrder(scpi1Id,50,4)
  await transaction.wait()

  console.log('user2 wants to sell 3 shares from SCPI1 for 75% of its price')
  transaction = await marketplace.connect(user2).createSellOrder(scpi1Id,75,3)
  await transaction.wait()

  console.log('user2 wants to sell 100 shares from SCPI2 for 90% of its price')
  transaction = await marketplace.connect(user2).createSellOrder(scpi2Id,90,100)
  await transaction.wait()

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});