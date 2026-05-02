import React, { useState } from 'react'
import { assets, cityList } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import {motion} from 'motion/react'

const Hero = () => {

    const [pickupLocation, setPickupLocation] = useState('')

    const {pickupDate, setPickupDate, returnDate, setReturnDate, navigate} = useAppContext()

    const handleSearch = (e)=>{
        e.preventDefault()
        navigate('/cars?pickupLocation=' + pickupLocation + '&pickupDate=' + pickupDate + '&returnDate=' + returnDate)
    }

  return (
    <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.8 }}
    className='hero-shell px-6 py-10 md:px-16 lg:px-24 xl:px-32'>

      <div className='mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]'>
        <div className='text-left'>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className='mb-5 w-max rounded-full border border-borderColor bg-white/70 px-4 py-2 text-sm font-semibold text-primary'
        >
          AI-powered car rental operations
        </motion.p>
        <motion.h1 initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
        className='max-w-4xl text-5xl font-semibold leading-[0.95] text-gray-950 md:text-7xl'>Fleet booking software for modern rental teams.</motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className='mt-6 max-w-2xl text-lg leading-8 text-gray-600'
        >
          Search available cars, accept payments, collect licenses, manage inventory, and guide customers with an AI rental assistant from one polished workspace.
        </motion.p>
      
      <motion.form
      initial={{ scale: 0.95, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}

       onSubmit={handleSearch} className='mt-8 flex w-full max-w-3xl flex-col items-start justify-between rounded-3xl border border-borderColor bg-white p-5 shadow-[0px_24px_60px_rgba(28,25,23,0.14)] md:flex-row md:items-center'>

        <div className='flex flex-col md:flex-row items-start md:items-center gap-10 min-md:ml-8'>
            <div className='flex flex-col items-start gap-2'>
                <select required value={pickupLocation} onChange={(e)=>setPickupLocation(e.target.value)}>
                    <option value="">Pickup Location</option>
                    {cityList.map((city)=> <option key={city} value={city}>{city}</option>)}
                </select>
                <p className='px-1 text-sm text-gray-500'>{pickupLocation ? pickupLocation : 'Please select location'}</p>
            </div>
            <div className='flex flex-col items-start gap-2'>
                <label htmlFor='pickup-date'>Pick-up Date</label>
                <input value={pickupDate} onChange={e=>setPickupDate(e.target.value)} type="date" id="pickup-date" min={new Date().toISOString().split('T')[0]} className='text-sm text-gray-500' required/>
            </div>
            <div className='flex flex-col items-start gap-2'>
                <label htmlFor='return-date'>Return Date</label>
                <input value={returnDate} onChange={e=>setReturnDate(e.target.value)} type="date" id="return-date" className='text-sm text-gray-500' required/>
            </div>
            
        </div>
            <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className='flex items-center justify-center gap-1 rounded-full bg-primary px-9 py-3 text-white hover:bg-primary-dull max-sm:mt-4 cursor-pointer'>
                <img src={assets.search_icon} alt="search" className='brightness-300'/>
                Search
            </motion.button>
      </motion.form>
      <div className='mt-8 grid max-w-xl grid-cols-3 gap-3'>
        {[
          ['24/7', 'availability'],
          ['3 min', 'booking flow'],
          ['100%', 'license-ready'],
        ].map(([value, label]) => (
          <div key={label} className='rounded-2xl border border-borderColor bg-white/70 p-4'>
            <p className='text-2xl font-bold text-gray-950'>{value}</p>
            <p className='text-sm text-gray-500'>{label}</p>
          </div>
        ))}
      </div>
      </div>

      <div className='relative rounded-[2rem] border border-borderColor bg-white/80 p-6 shadow-[0px_28px_80px_rgba(28,25,23,0.16)]'>
        <div className='mb-5 grid grid-cols-2 gap-3 text-sm'>
          <div className='rounded-2xl bg-light p-4'>
            <p className='font-semibold text-gray-900'>Live fleet</p>
            <p className='text-gray-500'>Cars update in real time</p>
          </div>
          <div className='rounded-2xl bg-gray-950 p-4 text-white'>
            <p className='font-semibold'>AI matching</p>
            <p className='text-white/70'>Budget, brand, city</p>
          </div>
        </div>
      <motion.img 
        initial={{ y: 100, opacity: 0 }}
       animate={{ y: 0, opacity: 1 }}
       transition={{ duration: 0.8, delay: 0.6 }}
      src={assets.car_image3} alt="premium rental SUV" className='aspect-[16/10] w-full rounded-3xl object-cover'/>
      </div>
      </div>
    </motion.div>
  )
}

export default Hero
