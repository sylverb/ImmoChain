import React, { useContext, createContext } from 'react';

import { useAddress, useContract, useMetamask, useContractWrite } from '@thirdweb-dev/react';
import { ethers } from 'ethers';
import { EditionMetadataWithOwnerOutputSchema } from '@thirdweb-dev/sdk';
import { contractAddress, contractAbi } from '../../contract';

const StateContext = createContext();

export const StateContextProvider = ({ children }) => {
  const { contract } = useContract(contractAddress,contractAbi);
  const { mutateAsync: createCampaign } = useContractWrite(contract, 'createCampaign');

  const address = useAddress();
  const connect = useMetamask();

  const publishCampaign = async (form) => {
    try {
      const data = await createCampaign({
				args: [
					address, // owner
					form.title, // title
					form.description, // description
					form.target,
					new Date(form.deadline).getTime(), // deadline,
					form.image,
				],
			});

      console.log("contract call success", data)
    } catch (error) {
      console.log("contract call failure", error)
    }
  }

  const createScpi = async (form) => {
    try {
      console.log("form name = "+form.name);
      const data = await contract.call('registerNewScpi',
					address, // owner
					form.name, // name
					form.sharesAmount, // shares amount
					form.image,
					form.sharePublicPrice);

      console.log("contract call success", data)
    } catch (error) {
      console.log("contract call failure", error)
    }
  }

  const getScpiInfos = async () => {
    const scpiInfos = await contract.call('getScpiInfos');

    const parsedInfos = scpiInfos.map((scpiInfo, i) => ({
      title: scpiInfo.name,
      description: "Desc",
      target: "5",
      deadline: 55,
      amountCollected: "0",
      publicPrice: scpiInfo.publicPrice.toNumber(),
      image: scpiInfo.uri,
      pId: i
    }));

    return parsedInfos;
  }


  const getUserCampaigns = async () => {
    const allCampaigns = await getScpiInfos();

    const filteredCampaigns = allCampaigns.filter((campaign) => campaign.owner === address);

    return filteredCampaigns;
  }

  const donate = async (pId, amount) => {
    const data = await contract.call('donateToCampaign', [pId], { value: ethers.utils.parseEther(amount)});

    return data;
  }

  const getDonations = async (pId) => {
    const donations = await contract.call('getDonators', [pId]);
    const numberOfDonations = donations[0].length;

    const parsedDonations = [];

    for(let i = 0; i < numberOfDonations; i++) {
      parsedDonations.push({
        donator: donations[0][i],
        donation: ethers.utils.formatEther(donations[1][i].toString())
      })
    }

    return parsedDonations;
  }


  return (
    <StateContext.Provider
      value={{ 
        address,
        contract,
        connect,
        createCampaign: publishCampaign,
        createScpi,
        getScpiInfos,
        getUserCampaigns,
        donate,
        getDonations
      }}
    >
      {children}
    </StateContext.Provider>
  )
}

export const useStateContext = () => useContext(StateContext);