import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const UserLayout = () => {
  return (
    <div className='mx-4 sm:mx-[10%]'>
      <Navbar />
      <main className='min-h-[calc(100vh-160px)]'>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default UserLayout
