import React, { useState, useEffect } from 'react'

import { DisplayScpi } from '../components';
import { useStateContext } from '../context'

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [scpiList, setScpiList] = useState([]);
  const [hasScpiListChanged, setHasScpiListChanged] = useState(false); // Nouvel état pour suivre les changements de scpiList

  const { address, scpiNftContract, marketplaceContract, getScpiInfos } = useStateContext();

  const fetchScpi = async () => {
    setIsLoading(true);
    const data = await getScpiInfos();
    const newData = data.filter((scpi) => !scpiList.some((prevScpi) => prevScpi.id === scpi.id));

    setScpiList((prevScpiList) => [...prevScpiList, ...newData]);
    setIsLoading(false);
    setHasScpiListChanged(true);
  }

  useEffect(() => {
    if(scpiNftContract) fetchScpi();
  }, [address, scpiNftContract, marketplaceContract]);

  useEffect(() => {
    if (hasScpiListChanged) {
      const sortedData = [...scpiList].sort((a, b) => a.title.localeCompare(b.title));
      setScpiList(sortedData);
      setHasScpiListChanged(false); // Réinitialiser hasScpiListChanged après le tri
    }  }, [scpiList]);

  return (
    <DisplayScpi 
      title="Liste des SCPI"
      isLoading={isLoading}
      scpiList={scpiList}
    />
  )
}

export default Home