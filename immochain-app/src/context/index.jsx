import React, { useContext, createContext } from 'react';

import { useAddress, useDisconnect, useContract, useMetamask, useContractWrite } from '@thirdweb-dev/react';
import { ethers } from 'ethers';
import { scpiNftContractAddress, scpiNftContractAbi } from '../../contract';
import { marketplaceContractAddress, marketplaceContractAbi } from '../../contract';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

  function getTextFromError(error) {
    return error.reason
  }

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
      toast.error(`Une erreur s\'est produite = ${getTextFromError(error)}`);
      console.log("createScpi call failure", JSON.stringify(error))
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
      toast.error(`Une erreur s\'est produite = ${getTextFromError(error)}`);
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
      toast.error(`Une erreur s\'est produite = ${getTextFromError(error)}`);
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
      toast.error(`Une erreur s\'est produite = ${getTextFromError(error)}`);
      console.log("createSellOrder call failure", error)
    }
  }

  const createBuyOrder = async (id,quantity,price) => {
    try {
     console.log("creatBuyOrder : "+ethers.utils.parseEther(price.toString()))
     await marketplaceContract.call('createBuyOrder',
          id, // id of the SCPI
          quantity, // number of shares to buy
          { value: ethers.utils.parseEther(price.toString()) }
      );

      console.log("createSellOrder call success")
    } catch (error) {
      toast.error(`Une erreur s\'est produite = ${getTextFromError(error)}`);
      console.log("createSellOrder call failure", error)
    }
  }

  const getOrderCountByPrice = async (id) => {
    const parsedSalesOrders = [];
    try {
      const datas = await marketplaceContract.call('getOrderCountByPrice',
          id, // id of the SCPI
      );

      const numberOfPriceSets = datas.length;

      for(let i = 0; i < numberOfPriceSets; i++) {
        if (datas[i].total.toNumber() > 0) {
            parsedSalesOrders.push({
              quantity: datas[i].total.toNumber(),
              unitPrice: datas[i].price.toNumber()
            })
        }
      }
    } catch (error) {
      console.log("getOrderCountByPrice call failure", error)
    }
    return parsedSalesOrders;
  }

  const getOrdersByAddress = async (id,address) => {
    const parsedSalesOrders = [];
    try {
      const datas = await marketplaceContract.call('getOrdersByAddress',
          id, // id of the SCPI
          address
      );

      console.log("getOrdersByAddress datas = "+datas);
      const numberOfPriceSets = datas.length;

      for(let i = 0; i < numberOfPriceSets; i++) {
        parsedSalesOrders.push({
          quantity: datas[i].quantity.toNumber(),
          unitPrice: datas[i].unitPrice.toNumber()
        })
      }
    } catch (error) {
      console.log("getOrderCountByPrice call failure", error)
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
      toast.error(`Une erreur s\'est produite = ${getTextFromError(error)}`);
      console.log("cancelSellOrder call failure", error)
    }
  }

  const getMarketplaceBalance = async () => {
    try {
      let funds = await marketplaceContract.call('getBalanceInfo');

      console.log("getMarketplaceBalance call success funds = "+funds)
      return funds;
    } catch (error) {
      console.log("getMarketplaceBalance call failure", error)
      return -1;
    }
  }

  const withdrawFunds = async (id) => {
    try {
     await marketplaceContract.call('withdrawFunds');

      console.log("withdrawFunds call success")
    } catch (error) {
      toast.error(`Une erreur s\'est produite = ${getTextFromError(error)}`);
      console.log("withdrawFunds call failure", JSON.stringify(error))
    }
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
        createBuyOrder,
        getOrdersByAddress,
        getOrderCountByPrice,
        cancelSaleOrders,
        getMarketplaceBalance,
        withdrawFunds
      }}
    >
      {children}
    </StateContext.Provider>
  )
}

export const useStateContext = () => useContext(StateContext);