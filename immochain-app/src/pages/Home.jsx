import React, { useState, useEffect } from 'react'

import { DisplayScpi } from '../components';
import { useStateContext } from '../context'

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [scpiList, setScpiList] = useState([]);

  const { address, contract, getScpiInfos } = useStateContext();

  const fetchScpi = async () => {
    setIsLoading(true);
    const data = await getScpiInfos();
    const updatedList = [...scpiList, ...data];
    const sortedData = updatedList.sort((a, b) => a.title.localeCompare(b.title));

    setScpiList(prevScpiList => [...prevScpiList, ...data]);
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

export default Home