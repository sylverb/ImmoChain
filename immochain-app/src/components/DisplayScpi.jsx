import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from "uuid";
import ScpiCard from './ScpiCard';
import { loader } from '../assets';

const DisplayScpi = ({ title, isLoading, scpiList }) => {
  const navigate = useNavigate();

  const handleNavigate = (campaign) => {
    navigate(`/scpi-shares/${campaign.title}`, { state: campaign })
  }
  
  return (
    <div>
      <h1 className="font-epilogue font-semibold text-[18px] text-white text-left">{title} ({scpiList.length})</h1>

      <div className="flex flex-wrap mt-[20px] gap-[26px]">
        {isLoading && (
          <img src={loader} alt="loader" className="w-[100px] h-[100px] object-contain" />
        )}

        {!isLoading && scpiList.length === 0 && (
          <p className="font-epilogue font-semibold text-[14px] leading-[30px] text-[#818183]">
            No SCPI available yet
          </p>
        )}

        {!isLoading && scpiList.length > 0 && scpiList.map((campaign) => <ScpiCard 
          key={uuidv4()}
          {...campaign}
          handleClick={() => handleNavigate(campaign)}
        />)}
      </div>
    </div>
  )
}

export default DisplayScpi