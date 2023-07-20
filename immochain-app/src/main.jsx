import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ChainId, ThirdwebProvider } from '@thirdweb-dev/react';

import { StateContextProvider } from './context';
import dotenv from 'dotenv';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
console.log("APP_ENV = "+process.env.NODE_ENV)
const chainId = process.env.NODE_ENV === 'production'
  ? ChainId.Mumbai
  : ChainId.Hardhat;
console.log("NODE_ENV chainId = "+chainId)
root.render(
  <ThirdwebProvider desiredChainId={chainId}> 
    <Router>
      <StateContextProvider>
        <App />
      </StateContextProvider>
    </Router>
  </ThirdwebProvider> 
)