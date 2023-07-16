module.exports = async function ({getNamedAccounts, deployments}) {
    const {execute} = deployments;
    const namedAccounts = await getNamedAccounts();
    const {deployer} = await namedAccounts;
    const marketplace = await deployments.get('Marketplace');
    console.log('Set marketplace address '+marketplace.address);
    await execute('ScpiNFT', {from: deployer}, 'setMarketplaceAddress', marketplace.address);
  };
  module.exports.tags = ['Configure'];
  module.exports.runAtTheEnd = true;