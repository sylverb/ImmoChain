import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

import { useStateContext } from '../context';
import { CountBox, CustomButton, FormField, Loader } from '../components';
import { calculateBarPercentage } from '../utils';
import { thirdweb } from '../assets';
import { useAddress } from '@thirdweb-dev/react';

const ScpiDetails = () => {
  const { state } = useLocation();
  const { getSalesOrders, createSaleOrder, cancelSaleOrders, scpiNftContract, marketplaceContract, getSharesBalance, address } = useStateContext();

  const [isLoading, setIsLoading] = useState(false);
  const [sharesAmount, setSharesAmount] = useState();
  const [sellPrice, setSellPrice] = useState(100);
  const [salesOrders, setSalesOrders] = useState([]);
  const [balance, setBalance] = useState();

  const userAddress = useAddress(); // get connected wallet address

  const fetchSalesOrders = async () => {
    const data = await getSalesOrders(state.pId);

    setSalesOrders(data);
  }

  const fetchOwnedShares = async () => {
    const result = await getSharesBalance(userAddress, state.pId);
    setBalance(result);
  }

  useEffect(() => {
    if(marketplaceContract) fetchSalesOrders();
  }, [marketplaceContract])

  useEffect(() => {
    if(scpiNftContract) fetchOwnedShares();
  }, [marketplaceContract])

  const handleCreateShareSale = async () => {
    setIsLoading(true);

    await createSaleOrder(state.pId, sellPrice, sharesAmount); 

    setIsLoading(false);
  }

  const handleCancelShareSale = async () => {
    setIsLoading(true);

    await cancelSaleOrders(state.pId); 

    setIsLoading(false);
  }
  const handleBuyShareSale = async () => {
    setIsLoading(true);

    setIsLoading(false);
  }
  
  return (
    <div>
      {isLoading && <Loader />}

      <div className="w-full flex md:flex-row flex-col mt-10 gap-[30px]">
        <div className="flex-1 flex-col">
          <img src={state.image} alt="campaign" className="w-full h-[410px] object-cover rounded-xl"/>
          <div className="relative w-full h-[5px] bg-[#3a3a43] mt-2">
            <div className="absolute h-full bg-[#4acd8d]" style={{ width: `${calculateBarPercentage(state.target, state.amountCollected)}%`, maxWidth: '100%'}}>
            </div>
          </div>
        </div>

        <div className="flex md:w-[150px] w-full flex-wrap justify-between gap-[30px]">
          <CountBox title="Nombre de parts total" value={state.totalShares} />
          <CountBox title="Nombre de parts possédées" value={balance} />
          <CountBox title="Prix public des parts" value={state.publicPrice} />
        </div>
      </div>

      <div className="mt-[60px] flex lg:flex-row flex-col gap-5">
      <div className="flex-1">
          <h4 className="font-epilogue font-semibold text-[18px] text-white uppercase">Mettre des parts en vente</h4>   

          <div className="mt-[20px] flex flex-col p-4 bg-[#1c1c24] rounded-[10px]">
            <p className="font-epilogue fount-medium text-[20px] leading-[30px] text-center text-[#808191]">
              Prix de vente en % du prix public
            </p>
            <div className="mt-[30px]">
              <input 
                type="number"
                placeholder=""
                step="5"
                className="w-full py-[10px] sm:px-[20px] px-[15px] outline-none border-[1px] border-[#3a3a43] bg-transparent font-epilogue text-white text-[18px] leading-[30px] placeholder:text-[#4b5264] rounded-[10px]"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />

              <FormField 
                labelName="Nombre de parts de SCPI à mettre en vente"
                placeholder="nombre de parts"
                inputType="text"
                value={sharesAmount}
                handleChange={(e) => setSharesAmount(e.target.value)}
              />

              <CustomButton 
                btnType="button"
                title="Mettre en vente"
                styles="w-full bg-[#8c6dfd]"
                handleClick={handleCreateShareSale}
              />
            </div>
          </div>
        </div>
        <div className="flex-[2] flex flex-col gap-[40px]">
          <div>
            <h4 className="font-epilogue font-semibold text-[18px] text-white uppercase">Ordres de vente</h4>

              <div className="mt-[20px] flex flex-col gap-4">
                {salesOrders.length > 0 ? salesOrders.map((item, index) => (
                  <div key={`${item.listedBy}-${index}`} className="flex justify-between items-center gap-4">
                    {item.listedBy === userAddress ? (
                    <p className="font-epilogue font-normal text-[16px] text-[#b2b3bd] leading-[26px] break-ll">{index + 1}. Vous</p>
                    ):
                    (
                    <p className="font-epilogue font-normal text-[16px] text-[#b2b3bd] leading-[26px] break-ll">{index + 1}. {item.listedBy}</p>
                    )}
                    <CountBox title="Nombre de parts" value={item.quantity} />
                    {item.listedBy === userAddress ? (
                    <CustomButton 
                      btnType="button"
                      title="Annuler"
                      styles="w-100px bg-[#8c6dfd]"
                      handleClick={() => handleCancelShareSale()}
                    />
                    ) : (
                    <CustomButton 
                      btnType="button"
                      title="Acheter"
                      styles="w-100px bg-[#8c6dfd]"
                      handleClick={() => handleBuyShareSale()}
                    />
                    )}

                  </div>
                )) : (
                  <p className="font-epilogue font-normal text-[16px] text-[#808191] leading-[26px] text-justify">Aucune part en vente</p>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScpiDetails