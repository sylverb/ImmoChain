import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

import { useStateContext } from '../context';
import { money } from '../assets';
import { CustomButton, FormField, Loader } from '../components';
import { checkIfImage } from '../utils';

const RegisterScpi = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { createScpi } = useStateContext();
  const [form, setForm] = useState({
    name: '',
    sharesAmount: '', 
    sharePublicPrice: '', 
    image: ''
  });

  const handleFormFieldChange = (fieldName, e) => {
    setForm({ ...form, [fieldName]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    checkIfImage(form.image, async (exists) => {
      if(exists) {
        setIsLoading(true)
        await createScpi({ ...form})
        setIsLoading(false);
        navigate('/');
      } else {
        alert('Provide valid image URL')
        setForm({ ...form, image: '' });
      }
    })
  }

  return (
    <div className="bg-[#1c1c24] flex justify-center items-center flex-col rounded-[10px] sm:p-10 p-4">
      {isLoading && <Loader />}
      <div className="flex justify-center items-center p-[16px] sm:min-w-[380px] bg-[#3a3a43] rounded-[10px]">
        <h1 className="font-epilogue font-bold sm:text-[25px] text-[18px] leading-[38px] text-white">Register a new SCPI</h1>
      </div>

      <form onSubmit={handleSubmit} className="w-full mt-[65px] flex flex-col gap-[30px]">
        <div className="flex flex-wrap gap-[40px]">
          <FormField 
            labelName="SCPI Name"
            placeholder="name"
            inputType="text"
            value={form.name}
            handleChange={(e) => handleFormFieldChange('name', e)}
          />
        </div>
        
        <div className="flex flex-wrap gap-[40px]">
          <FormField 
            labelName="SCPI Shares amount"
            placeholder="number of shares you want to create"
            inputType="text"
            value={form.sharesAmount}
            handleChange={(e) => handleFormFieldChange('sharesAmount', e)}
          />
          <FormField 
            labelName="SCPI Shares public price"
            placeholder="Current price of a share in Euros"
            inputType="text"
            value={form.sharePublicPrice}
            handleChange={(e) => handleFormFieldChange('sharePublicPrice', e)}
          />
        </div>

        <FormField 
            labelName="SCPI logo image"
            placeholder="Place image URL of your logo"
            inputType="url"
            value={form.image}
            handleChange={(e) => handleFormFieldChange('image', e)}
          />

          <div className="flex justify-center items-center mt-[40px]">
            <CustomButton 
              btnType="submit"
              title="Create new SCPI"
              styles="bg-[#1dc071]"
            />
          </div>
      </form>
    </div>
  )
}

export default RegisterScpi