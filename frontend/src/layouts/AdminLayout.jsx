import React from 'react'
import { Outlet } from 'react-router-dom'
import SidebarAdmin from '../components/SidebarAdmin'

const AdminLayout = () => {
  return (
    <div className='min-h-screen bg-slate-50'>
      <div className='flex min-h-screen'>
        <SidebarAdmin />
        <main className='flex-1 p-6 lg:p-8'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
