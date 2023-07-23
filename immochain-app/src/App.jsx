import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { Sidebar, Navbar } from './components';
import { ScpiDetails, RegisterScpi, Home, Profile } from './pages';
import { ToastContainer } from 'react-toastify';

const App = () => {
  return (
    <div className="relative sm:-8 p-4 bg-[#13131a] min-h-screen flex flex-row">
      <div className="sm:flex hidden mr-10 relative">
        <Sidebar />
      </div>

      <div className="flex-1 max-sm:w-full max-w-[1280px] mx-auto sm:pr-5">
        <Navbar />
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/register-scpi" element={<RegisterScpi />} />
          <Route path="/scpi-shares/:id" element={<ScpiDetails />} />
        </Routes>
      </div>
    </div>
  )
}

export default App