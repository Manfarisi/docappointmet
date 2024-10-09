import React from 'react'
import { assets } from '../assets/assets_frontend/assets'

const Footer = () => {
  return (
    <div className='md:mx-10'>
        <div className='flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm'>

        
            {/* left section */}
        <div>
            <img className='mb-5 wb-48' src={assets.logo} alt="" />
            <p className='w-full md:w-2/3 text-gray-700 leading-6'>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Sed hic quasi, saepe quia delectus beatae ex minus in est minima ad, atque modi deserunt mollitia, temporibus expedita ratione et eos?</p>
        </div>

            {/* center section */}
        <div>
            <p className='text-xl font-medium mb-5'>COMPANY</p>
            <ul className='flex flex-col gap-2 text-gray-700'>
                <li>Home</li>
                <li>About us</li>
                <li>Contact us</li>
                <li>Privacy Policy</li>
            </ul>
        </div>

            {/* right section */}
        <div>
            <p className='text-xl font-medium mb-5'>GET IN TOUCH</p>
            <ul className='flex flex-col gap 2 text-gray-600'>
                <li>kingmansalman@gmail.com</li>
                <li>+62-8311-511-6351</li>
            </ul>
        </div>
        </div>
        {/* CopyRight */}
        <div>
            <hr />
            <p className='py-5 text-sm text-center'>&copy; 2024 Salman Al Farisi. All rights reserved.</p>
        </div>
    </div>
  )
}

export default Footer