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
    
    setScpiList((prevScpiList) => {
      // On fait le filtre en se basant sur l'état précédent
      const newData = data.filter((scpi) => !prevScpiList.some((prevScpi) => prevScpi.id === scpi.id));
      return [...prevScpiList, ...newData]; // On retourne la nouvelle liste
    });
    setIsLoading(false);
    setHasScpiListChanged(true);
  }

  useEffect(() => {
    if(scpiNftContract) {
      fetchScpi(); 
      fetchScpi();
    }
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