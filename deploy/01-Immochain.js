// Deployment script for hardhat-deploy
// It deploys ScpiNFT smartcontract then
// it deploys Marketplace smartcontract with address of ScpiNFT as parameter

module.exports = async ({getNamedAccounts, deployments}) => {
  const { deploy} = deployments
  const { deployer } = await getNamedAccounts()

  console.log('Deploying as '+deployer);

  const contract1 = await deploy('ScpiNFT', {
    from: deployer,
    args: [],
    log: true,
  });

  const contract2 = await deploy('Marketplace', {
    from: deployer,
    args: [contract1.address],
    log: true,
  });
}

module.exports.tags = ['Deployer'];
