import React, { useState, useContext } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const Navbar = () => {
    const navigate = useNavigate()
    const [showMenu, setShowMenu] = useState(false)
    const { user, logout, loading } = useContext(AppContext)

    const handleLogout = async () => {
        const result = await logout()
        if (result.success) {
            navigate('/login')
        }
    }

    return (
        <div className='flex items-center justify-between text-sm py-4 mb-5 border-b border-b-gray-400'>
            <div onClick={() => navigate('/')} className='w-44 cursor-pointer text-xl font-bold text-green-700'>DocAppointment</div>
            <ul className='hidden md:flex items-start gap-5 font-medium'>
                <NavLink to='/'>
                    <li className='py-1'>HOME</li>
                    <hr className='border-none outline-none h-0.5 bg-green-500 w-3/5 m-auto hidden' />
                </NavLink>
                <NavLink to='/doctors'>
                    <li className='py-1'>ALL DOCTORS</li>
                    <hr className='border-none outline-none h-0.5 bg-green-500 w-3/5 m-auto hidden' />
                </NavLink>
                <NavLink to='/about'>
                    <li className='py-1'>ABOUT</li>
                    <hr className='border-none outline-none h-0.5 bg-green-500 w-3/5 m-auto hidden' />
                </NavLink>
                <NavLink to='/contact'>
                    <li className='py-1'>CONTACT</li>
                    <hr className='border-none outline-none h-0.5 bg-green-500 w-3/5 m-auto hidden' />
                </NavLink>
                {user?.user_metadata?.role === 'admin' && (
                  <NavLink to='/admin/doctors'>
                    <li className='py-1 text-red-600'>ADMIN</li>
                  </NavLink>
                )}
            </ul>
            <div className='flex items-center gap-4'>
                {
                    user
                        ? <div className='flex items-center gap-2 cursor-pointer group relative'>
                            <div className='w-10 h-10 rounded-full bg-gray-300 text-center leading-[2.5rem] text-sm text-gray-700'>
                              {user.user_metadata?.full_name?.[0] || 'U'}
                            </div>
                            <span className='w-2.5 text-gray-500'>▾</span>
                            <div className='absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20 hidden group-hover:block'>
                                <div className='min-w-48 bg-stone-100 rounded flex flex-col gap-4 p-4'>
                                    <p onClick={() => navigate('/my-profile')} className='hover:text-black cursor-pointer'>My Profile</p>
                                    <p onClick={() => navigate('/my-appointments')} className='hover:text-black cursor-pointer'>My Appointments</p>
                                    <p onClick={handleLogout} className='hover:text-black cursor-pointer' disabled={loading}>
                                        {loading ? 'Logging out...' : 'Logout'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        : <button onClick={() => navigate('/login')} className='bg-green-500 text-white px-8 py-3 rounded-full font-light hidden md:block'>Create Account</button>
                }
                <button onClick={() => setShowMenu(true)} className='w-6 md:hidden text-2xl'>☰</button>
                {/* mobile menu */}
                <div className={`${showMenu ? 'fixed w-full' : 'h-0 w-0'} md:hidden right-0 top-0 bottom-0 z-20 overflow-hidden bg-white transition-all`}>
                <div className='flex item-center justify-between px-5 py-6'>
                    <div className='text-lg font-bold'>DocAppointment</div>
                    <button className='w-7 text-2xl' onClick={()=>setShowMenu(false)}>✕</button>
                </div>
                <ul className='flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium'>
                    <NavLink onClick={()=>setShowMenu(false)} to='/'><p className='px-4 py2 rounded inline-block'>Home</p></NavLink>
                    <NavLink onClick={()=>setShowMenu(false)} to='/doctors'><p className='px-4 py2 rounded inline-block'> ALL DOCTORS</p></NavLink>
                    <NavLink onClick={()=>setShowMenu(false)} to='/about'><p className='px-4 py2 rounded inline-block'>ABOUT</p></NavLink>
                    <NavLink onClick={()=>setShowMenu(false)} to='/contact'><p className='px-4 py2 rounded inline-block'>CONTACT</p></NavLink>
                    {user?.user_metadata?.role === 'admin' && (
                      <NavLink onClick={()=>setShowMenu(false)} to='/admin/doctors'><p className='px-4 py2 rounded inline-block text-red-600'>ADMIN</p></NavLink>
                    )}
                </ul>
            </div>
        </div>
    </div>
  )
}

export default Navbar