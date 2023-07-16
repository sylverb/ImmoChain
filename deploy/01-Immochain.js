// Deployment script for hardhat-deploy
// It deploys ScpiNFT smartcontract then
// it deploys Marketplace smartcontract with address of ScpiNFT as parameter

module.exports = async ({getNamedAccounts, deployments}) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log('Deploying as '+deployer);

  const scpiNft = await deploy('ScpiNFT', {
    from: deployer,
    args: [],
    log: true,
  });

  const marketplace = await deploy('Marketplace', {
    from: deployer,
    args: [scpiNft.address],
    log: true,
  });
}

module.exports.tags = ['Deployer'];
