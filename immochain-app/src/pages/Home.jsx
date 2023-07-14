import React, { useState, useEffect } from 'react'

import { DisplayScpi } from '../components';
import { useStateContext } from '../context'

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);

  const { address, contract, getScpiInfos } = useStateContext();

  const fetchCampaigns = async () => {
    setIsLoading(true);
    const data = await getScpiInfos();
    setCampaigns(data);
    setIsLoading(false);
  }

  useEffect(() => {
    if(contract) fetchCampaigns();
  }, [address, contract]);

  return (
    <DisplayScpi 
      title="All SCPI"
      isLoading={isLoading}
      campaigns={campaigns}
    />
  )
}

export default Home