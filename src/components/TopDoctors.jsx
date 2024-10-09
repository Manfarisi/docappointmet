import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const TopDoctors = () => {

  const navigate = useNavigate()
  const {doctors} = useContext(AppContext)

  return (
    <div className='flex flex-col items-center gap-4 my16 text-gray-900 md:mx-10'>
      <h1 className='text-3xl font-medium'>Top Doctors to Book</h1>
      <p className='sm:w-1/3 text-center text-sm'> Simply browse throught our extensive list of trusted doctors.</p>
      <div className='w-full grid grid-cols-auto gap-4 pt-5 gap-y-6 px-3 sm:px-0'>
         {doctors.slice(0,10).map((item,index)=>(
          <div onClick={()=>[navigate(`/appointment/${item._id}`), scrollTo(0,0)]} className='border border-emerald-800 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500' key={index}>
            <img className='bg-green-200' src={item.image} alt="" />
              <div className='p-4'>
                <div className='flex items-center gap-2 text-sm text-center text-blue-600'>
                  <p className='w-2 h-2 bg-blue-600 rounded-full'></p><p>Avaible</p>
                </div>
                <p className='text-black text-lg font-medium'>{item.name}</p>
                <p className='text-black text-sm'>{item.speciality}</p>
              </div>
          </div>
         ))}
      </div>
      <button onClick={()=>{navigate('/doctors'); scrollTo(0,0)}} className='bg-green-500 text-gray-900 px-12 py-3 rounded-full mt-10'>more</button>
    </div>
    )

}

export default TopDoctors