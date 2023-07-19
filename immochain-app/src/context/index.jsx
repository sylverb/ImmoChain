import React, { useContext, createContext } from 'react';

import { useAddress, useDisconnect, useContract, useMetamask, useContractWrite } from '@thirdweb-dev/react';
import { ethers } from 'ethers';
import { scpiNftContractAddress, scpiNftContractAbi } from '../../contract';
import { marketplaceContractAddress, marketplaceContractAbi } from '../../contract';

const StateContext = createContext();

export const StateContextProvider = ({ children }) => {
  const { contract : scpiNftContract } = useContract(scpiNftContractAddress, scpiNftContractAbi);
  const { contract : marketplaceContract } = useContract(marketplaceContractAddress, marketplaceContractAbi);

  const address = useAddress();
  const connect = useMetamask();
  const disconnect = useDisconnect();

  /*************************************************/
  /* SCPI NFT actions                           */
  /*************************************************/

  const createScpi = async (form) => {
    try {
      console.log("createScpi = "+form.name);
      const data = await scpiNftContract.call('registerNewScpi',
          form.address, // address
          form.name, // name
          form.sharesAmount, // shares amount
          form.image,
          ethers.utils.parseEther(form.sharePublicPrice));

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
      publicPrice: ethers.utils.formatUnits(event.data.publicPrice, "ether"),
      image: event.data.uri,
      totalShares: event.data.amount.toNumber(),
      pId: event.data.companyId.toNumber(),
      scpiAddress: event.data.recipient
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

  const transferScpiShares = async (id,amount,from,to) => {
    try {
      console.log("transferScpiShares id="+id +" amount="+amount+" from="+from+" to="+to)
      const data = await scpiNftContract.call('safeTransferFrom',
          from,
          to,
          id,
          amount,
          ethers.constants.HashZero)

      console.log("contract call success", data)
    } catch (error) {
      console.log("contract call failure", error)
    }
  }

  /*************************************************/
  /* Marketplace actions                           */
  /*************************************************/
  
  const createSaleOrder = async (id,price,quantity) => {
    try {
     await marketplaceContract.call('createSellOrder',
          id, // id of the SCPI
          price, // price per share
          quantity // number of shares to sell
      );

      console.log("createSellOrder call success")
    } catch (error) {
      console.log("createSellOrder call failure", error)
    }
  }

  const getSalesOrders = async (id) => {
    const parsedSalesOrders = [];
    try {
      const datas = await marketplaceContract.call('getOrders',
          id, // id of the SCPI
      );

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

  const cancelSaleOrders = async (id) => {
    try {
     await marketplaceContract.call('cancelSellOrder',
          id, // id of the SCPI
      );

      console.log("cancelSellOrder call success")
    } catch (error) {
      console.log("cancelSellOrder call failure", error)
    }
  }

  const getUserCampaigns = async () => {
    const allCampaigns = await getScpiInfos();

    const filteredCampaigns = allCampaigns.filter((campaign) => campaign.owner === address);

    return filteredCampaigns;
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
        disconnect,
        createScpi,
        transferScpiShares,
        getSharesBalance,
        getScpiInfos,
        createSaleOrder,
        getSalesOrders,
        cancelSaleOrders,
        getUserCampaigns,
        getDonations
      }}
    >
      {children}
    </StateContext.Provider>
  )
}

export const useStateContext = () => useContext(StateContext);