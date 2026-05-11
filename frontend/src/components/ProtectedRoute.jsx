import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useContext(AppContext)

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <p className='text-lg text-gray-600'>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to='/login' replace />
  }

  if (requiredRole && user.user_metadata?.role !== requiredRole) {
    return (
      <div className='p-8'>
        <p className='text-lg font-semibold text-red-600'>Access Denied</p>
        <p className='text-sm text-gray-600'>You do not have permission to access this page.</p>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
