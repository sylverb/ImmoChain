import React, { useState, useEffect } from 'react'

import { DisplayScpi } from '../components';
import { useStateContext } from '../context'

const Profile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [scpiList, setScpiList] = useState([]);

  const { address, contract, getUserCampaigns } = useStateContext();

  const fetchScpi = async () => {
    setIsLoading(true);
    const data = await getUserCampaigns();
    setScpiList(data);
    setIsLoading(false);
  }

  useEffect(() => {
    if(contract) fetchScpi();
  }, [address, contract]);

  return (
    <DisplayScpi 
      title="All SCPI"
      isLoading={isLoading}
      scpiList={scpiList}
    />
  )
}

export default Profile