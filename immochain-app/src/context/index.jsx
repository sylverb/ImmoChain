import React, { useContext, createContext } from 'react';

import { useAddress, useContract, useMetamask, useContractWrite } from '@thirdweb-dev/react';
import { ethers } from 'ethers';
import { scpiNftContractAddress, scpiNftContractAbi } from '../../contract';
import { marketplaceContractAddress, marketplaceContractAbi } from '../../contract';

const StateContext = createContext();

export const StateContextProvider = ({ children }) => {
  const { contract : scpiNftContract } = useContract(scpiNftContractAddress, scpiNftContractAbi);
  const { contract : marketplaceContract } = useContract(marketplaceContractAddress, marketplaceContractAbi);
  const { mutateAsync: createCampaign } = useContractWrite(scpiNftContract, 'createCampaign');

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
      console.log("createScpi = "+form.name);
      const data = await scpiNftContract.call('registerNewScpi',
          form.address, // address
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
    const events = await scpiNftContract.events.getEvents('RegisterNewScpi');
    console.log("+++getScpiInfos events = "+events.length);
    const parsedInfos = events.map((event, i) => ({
      title: event.data.name,
      publicPrice: event.data.publicPrice.toNumber(),
      image: event.data.uri,
      totalShares: event.data.amount.toNumber(),
      pId: event.data.companyId.toNumber()
    }));

    return parsedInfos;
  }

  const getSharesBalance = async (address, pid) => {
    try {
      console.log("getSharesBalance address ="+address+" / pid = "+pid)
      const balance = await scpiNftContract.call('balanceOf',
      address, // address to get balance of
      pid // id of the SCPI
      );
      console.log("getSharesBalance  ="+balance)
      return balance.toNumber()
    } catch (error) {
      console.log("getSharesBalance call failure", error)
      return 0
    }

  }

  const getSalesOrders = async (id) => {
    const parsedSalesOrders = [];
    try {
      console.log("getSalesOrders id = "+id);
      const datas = await marketplaceContract.call('getOrders',
          id, // id of the SCPI
      );

      console.log("getSalesOrders call success", datas)
      const numberOfSaleOrders = datas.length;

      for(let i = 0; i < numberOfSaleOrders; i++) {
          parsedSalesOrders.push({
            listedBy: datas[i].listedBy,
            quantity: datas[i].quantity.toNumber(),
            unitPrice: datas[i].unitPrice.toNumber()
        })
      }
    } catch (error) {
      console.log("getSalesOrders call failure", error)
    }
    return parsedSalesOrders;
  }

  const getUserCampaigns = async () => {
    const allCampaigns = await getScpiInfos();

    const filteredCampaigns = allCampaigns.filter((campaign) => campaign.owner === address);

    return filteredCampaigns;
  }

  const donate = async (pId, amount) => {
    const data = await scpiNftContract.call('donateToCampaign', [pId], { value: ethers.utils.parseEther(amount)});

    return data;
  }

  const getDonations = async (pId) => {
    const donations = await scpiNftContract.call('getDonators', [pId]);
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
        scpiNftContract,
        marketplaceContract,
        connect,
        createScpi,
        getSharesBalance,
        getScpiInfos,
        getSalesOrders,
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