import React from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin/doctors', label: 'Doctors' }
]

const SidebarAdmin = () => {
  return (
    <aside className='w-64 min-h-screen bg-white border-r border-slate-200 p-6'>
      <div className='mb-10'>
        <p className='text-lg font-bold text-slate-900'>Admin Panel</p>
        <p className='text-sm text-slate-500 mt-1'>Manage the application</p>
      </div>

      <nav className='space-y-2'>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block rounded-xl px-4 py-3 text-sm font-medium ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default SidebarAdmin
