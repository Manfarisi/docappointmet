import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Doctors from './pages/Doctors'
import Login from './pages/Login'
import About from './pages/About'
import Contact from './pages/Contact'
import MyProfile from './pages/MyProfile'
import MyAppointments from './pages/MyAppointments'
import Appointment from './pages/Appointment'
import DoctorAppointments from './pages/doctor/DoctorAppointments'
import AdminDoctors from './pages/admin/AdminDoctors'
import ProtectedRoute from './components/ProtectedRoute'
import UserLayout from './layouts/UserLayout'
import AdminLayout from './layouts/AdminLayout'

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<UserLayout />}>
        <Route index element={<Home />} />
        <Route path='doctors' element={<Doctors />} />
        <Route path='doctors/:speciality' element={<Doctors />} />
        <Route path='login' element={<Login />} />
        <Route path='about' element={<About />} />
        <Route path='contact' element={<Contact />} />
        <Route path='my-profile' element={<MyProfile />} />
        <Route path='my-appointments' element={<MyAppointments />} />
        <Route path='appointment/:docId' element={<Appointment />} />
        <Route path='doctor/appointments' element={
          <ProtectedRoute requiredRole='doctor'>
            <DoctorAppointments />
          </ProtectedRoute>
        } />
      </Route>

      <Route path='/admin' element={
        <ProtectedRoute requiredRole='admin'>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route path='doctors' element={<AdminDoctors />} />
      </Route>
    </Routes>
  )
}

export default App