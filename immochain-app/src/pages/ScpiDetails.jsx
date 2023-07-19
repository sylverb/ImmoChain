import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

import { useStateContext } from '../context';
import { CountBox, CustomButton, FormField, Loader } from '../components';
import { calculateBarPercentage } from '../utils';
import { useAddress } from '@thirdweb-dev/react';

const ScpiDetails = () => {
  const { state } = useLocation();
  const { getSalesOrders, createSaleOrder, cancelSaleOrders, scpiNftContract, marketplaceContract, getSharesBalance, address, transferScpiShares } = useStateContext();

  const [isLoading, setIsLoading] = useState(false);
  const [sharesAmount, setSharesAmount] = useState();
  const [buySharesAmount, setBuySharesAmount] = useState();
  const [sellPrice, setSellPrice] = useState(100);
  const [salesOrders, setSalesOrders] = useState([]);
  const [rawSalesOrders, setRawSalesOrders] = useState([]);
  const [scpiDestAddress, setScpiDestAddress] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [balance, setBalance] = useState();

  const userAddress = useAddress(); // get connected wallet address

  const fetchSalesOrders = async () => {
    const orders = await getSalesOrders(state.pId);
    console.log("orders = "+JSON.stringify(orders));

    setMyOrders(await mySalesOrders(orders));
    setRawSalesOrders(orders);

    // Trie les commandes par unitPrice en ordre croissant
    orders.sort((a, b) => a.unitPrice - b.unitPrice);

    const groupedSalesOrders = orders.reduce((result, currentValue) => {
      let groupKey = currentValue['unitPrice'];
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(currentValue);
      return result;
    }, {});

    setSalesOrders(groupedSalesOrders);
  }

  const mySalesOrders = async (salesArray) => {
    const filteredOrders = salesArray.filter((order) => order.listedBy === userAddress);

    return filteredOrders;
  }

  const calculateTotalQuantity = (orders, unitPrice) => {
    const filteredOrders = orders[unitPrice] || [];
    if (filteredOrders.length === 0) {
      return 0;
    }
    const totalQuantity = filteredOrders.reduce((sum, order) => sum + order.quantity, 0);
    return totalQuantity;
  };

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
  
  const handleSendShares = async () => {
    setIsLoading(true);

    await transferScpiShares(state.pId,sharesAmount,userAddress,scpiDestAddress)

    setIsLoading(false);
  }

  return (
    <div>
      {isLoading && <Loader />}

      <div className="w-full flex md:flex-row flex-col mt-10 gap-[30px]">
        <div className="flex-1 flex-col">
          <img src={state.image} alt="scpi" className="w-full h-[410px] object-cover rounded-xl"/>
        </div>

        <div className="flex-1">
          <CountBox title="Nombre de parts possédées" value={balance} />
          <CountBox title="Prix public des parts" value={state.publicPrice}/>
        </div>
      </div>
      <div className="flex-1">
        <div className="relative w-full h-[3px] mt-2">
            <h4 className="font-epilogue font-semibold text-[45px] text-white">{state.title}</h4>   
        </div>
      </div>

      {userAddress !== state.scpiAddress && (
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
            <h4 className="font-epilogue font-semibold text-[18px] text-white uppercase">Parts disponibles à l'achat</h4>

            <div className="mt-[20px] flex flex-col p-4 bg-[#1c1c24] rounded-[10px]">
                <div className="mt-[20px] flex flex-col gap-4">
                <table className="table-auto">
                  <thead>
                    <tr>
                      <th className="font-epilogue font-normal text-[16px] text-[#b2b3bd]">Prix</th>
                      <th className="font-epilogue font-normal text-[16px] text-[#b2b3bd]">Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(salesOrders).map(([unitPrice, orders]) => (
                      <tr>
                        <td className="font-epilogue font-normal text-[16px] text-[#b2b3bd] text-center">{(unitPrice*state.publicPrice/100)} ETH</td>
                        <td className="font-epilogue font-normal text-[16px] text-[#b2b3bd] text-center">{calculateTotalQuantity(salesOrders,unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-[20px] flex flex-col p-4 bg-[#1c1c24] rounded-[10px]">
              <div className="mt-[20px] flex flex-col gap-4">
                <FormField 
                  placeholder="nombre de parts"
                  inputType="text"
                  value={buySharesAmount}
                  handleChange={(e) => setBuySharesAmount(e.target.value)}
                />

                <CustomButton 
                  btnType="button"
                  title="Acheter des parts"
                  styles="w-full bg-[#8c6dfd]"
                  handleClick={handleBuyShareSale}
                />
              </div>
            </div>

          </div>

          {Object.values(myOrders).length > 0 ? (
          <div>
            <h4 className="font-epilogue font-semibold text-[18px] text-white uppercase">Mes ventes</h4>

            <div className="mt-[20px] flex flex-col p-4 bg-[#1c1c24] rounded-[10px]">
                <div className="mt-[20px] flex flex-col gap-4">
                <table className="table-auto">
                  <thead>
                    <tr>
                      <th className="font-epilogue font-normal text-[16px] text-[#b2b3bd]">Prix</th>
                      <th className="font-epilogue font-normal text-[16px] text-[#b2b3bd]">Quantité</th>
                      <th className="font-epilogue font-normal text-[16px] text-[#b2b3bd]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(myOrders).map((order) => (
                    <tr>
                      <td className="font-epilogue font-normal text-[16px] text-[#b2b3bd] text-center">
                        {(order.unitPrice * state.publicPrice / 100)} ETH
                      </td>
                      <td className="font-epilogue font-normal text-[16px] text-[#b2b3bd] text-center">
                        {order.quantity}
                      </td>
                      <td className="text-center">
                        <CustomButton 
                          btnType="button"
                          title="Annuler"
                          styles="w-100px bg-[#8c6dfd]"
                          handleClick={() => handleCancelShareSale()}
                        />
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          ) : null}
        </div>
      </div>
     )}
      {userAddress === state.scpiAddress && (
      <div className="mt-[60px] flex lg:flex-row flex-col gap-5">
      <div className="flex-1">
          <h4 className="font-epilogue font-semibold text-[18px] text-white uppercase">Menu gestionnaire de SCPI</h4>   

          <div className="mt-[20px] flex flex-col p-4 bg-[#1c1c24] rounded-[10px]">
            <p className="font-epilogue fount-medium text-[20px] leading-[30px] text-center text-[#808191]">
              Envoi de parts vers un investisseur
            </p>
            <div className="mt-[30px]">
              <FormField 
                labelName="Nombre de parts"
                placeholder=""
                inputType="number"
                step="1"
                value={sharesAmount}
                handleChange={(e) => setSharesAmount(e.target.value)}
              />

              <FormField 
                labelName="Adresse de l'investisseur"
                placeholder="0x..."
                inputType="text"
                value={scpiDestAddress}
                handleChange={(e) => setScpiDestAddress(e.target.value)}
              />

              <CustomButton 
                btnType="button"
                title="Envoyer les parts"
                styles="w-full bg-[#8c6dfd]"
                handleClick={handleSendShares}
              />
            </div>
          </div>
        </div>
        </div>
      )}
     </div>
  )
}

export default ScpiDetails