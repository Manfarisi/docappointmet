import React, { useState, useContext, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

const Login = () => {
  const [state, setState] = useState('Sign Up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const { login, register, loading, user } = useContext(AppContext)
  const navigate = useNavigate()

  // Redirect based on user role
  useEffect(() => {
    if (user) {
      if (user.user_metadata?.role === 'admin') {
        navigate('/admin/doctors')
      } else {
        navigate('/')
      }
    }
  }, [user, navigate])

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all required fields')
      return
    }

    if (state === 'Sign Up' && !name) {
      setError('Full name is required for registration')
      return
    }

    try {
      let result
      if (state === 'Sign Up') {
        result = await register(email, password, name)
      } else {
        result = await login(email, password)
      }

      if (result.success) {
        // Redirect immediately based on user role from login response
        const userRole = result.data?.user?.user_metadata?.role
        if (userRole === 'admin') {
          navigate('/admin/doctors')
        } else {
          navigate('/')
        }
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-zinc-600 text-sm shadow-lg'>
        <p className='text-2xl font-extrabold'>{state === 'Sign Up' ? "Create Account" : "Login"}</p>
        <p>Please {state === 'Sign Up' ? "sign up" : "log in"} to book appointment</p>

        {error && (
          <div className='w-full p-2 bg-red-100 border border-red-400 text-red-700 rounded'>
            {error}
          </div>
        )}

        {
         state === "Sign Up" && <div className='w-full'>
              <p>Full Name</p>
              <input
                className='border border-zinc-300 rounded w-full p-2 mt-1'
                type="text"
                onChange={(e)=>setName(e.target.value)}
                value={name}
                required
              />
            </div>
        }

        <div className='w-full'>
          <p>Email</p>
          <input
            className='border border-zinc-300 rounded w-full p-2 mt-1'
            type="email"
            onChange={(e)=>setEmail(e.target.value)}
            value={email}
            required
          />
        </div>

        <div className='w-full'>
          <p>Password</p>
          <input
            className='border border-zinc-300 rounded w-full p-2 mt-1'
            type="password"
            onChange={(e)=>setPassword(e.target.value)}
            value={password}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className='bg-green-500 text-white w-full py-2 rounded-md text-base disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? 'Please wait...' : (state === 'Sign Up' ? "Create Account" : "Login")}
        </button>

        {
          state === 'Sign Up'
          ? <p>Already have an account ? <span onClick={()=>setState('Login')} className='text-green-500 underline cursor-pointer'> Login here</span></p>
          : <p>Don't have an account ? <span onClick={()=>setState('Sign Up')}  className='text-green-500 underline cursor-pointer'>Sign up here</span> </p>
        }
      </div>
    </form>
  )
}

export default Login