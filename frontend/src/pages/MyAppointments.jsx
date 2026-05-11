import React, { useContext } from 'react'
import { AppContext } from '../context/AppContext'

const MyAppointment = () => {

  const {doctors} = useContext(AppContext)
  return (
    <div>
      <p className='pb-3 mt-12 font-medium text-zinc-700 border-b'>My Appointment</p>
      <div>
        {doctors.slice(0,3).map((item,index)=>(
          <div className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-2 border-b' key={index}> 
            <div>
              {item.image ? (
                <img className='w-32 bg-indigo-50' src={item.image} alt={item.name} />
              ) : (
                <div className='w-32 h-32 bg-indigo-50 flex items-center justify-center text-gray-600'>No image</div>
              )}
            </div>
            <div className='flex-1 text-sm text-zinc-600'>
              <p className='text-neutral-800 font-semibold'>{item.name}</p>
              <p>{item.speciality}</p>
              <p className='text-xs mt-1'><span className='text-sm text-neutral-700 font-medium'>Notes:</span> Appointment details are managed by the doctor.</p>
            </div>
            <div className='flex flex-col gap-2 justify-end'>
              <button className='text-sm text-stone-700 text-center sm:win-w-48 py-2 border hover:bg-green-400 hover:text-white transition-all duration-300'>Pay Online</button>
              <button className='text-sm text-stone-700 text-center sm:win-w-48 py-2 border hover:bg-red-400 hover:text-white transition-all duration-300'>Cancel appointment</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyAppointment