import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'

const DoctorAppointments = () => {
  const {
    user,
    appointments,
    payments,
    loading,
    fetchAppointments,
    updateAppointmentStatus
  } = useContext(AppContext)

  const [rejectAppointmentId, setRejectAppointmentId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.user_metadata?.role === 'doctor') {
      fetchAppointments(user.id, 'doctor')
    }
  }, [user])

  const handleAccept = async (appointment) => {
    setError('')
    setMessage('')
    const result = await updateAppointmentStatus(appointment.id, 'confirmed')
    if (result.success) {
      setMessage('Appointment confirmed successfully.')
      setRejectAppointmentId('')
      setRejectReason('')
    } else {
      setError(result.error || 'Unable to confirm appointment.')
    }
  }

  const handleReject = async (appointment) => {
    setError('')
    setMessage('')
    if (!rejectReason.trim()) {
      setError('Please enter a reason for rejection.')
      return
    }

    const result = await updateAppointmentStatus(appointment.id, 'cancelled', rejectReason.trim())
    if (result.success) {
      setMessage('Appointment rejected successfully.')
      setRejectAppointmentId('')
      setRejectReason('')
    } else {
      setError(result.error || 'Unable to reject appointment.')
    }
  }

  const getPayment = (appointmentId) => payments.find((payment) => payment.appointment_id === appointmentId)

  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))

  return (
    <div className='py-8'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-slate-900'>Doctor Dashboard</h1>
        <p className='text-sm text-slate-600 mt-2'>View patient bookings and confirm or reject appointment requests.</p>
      </div>

      {message && <div className='mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700'>{message}</div>}
      {error && <div className='mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700'>{error}</div>}

      {loading && appointments.length === 0 ? (
        <div className='text-center py-12 text-slate-500'>Loading appointments...</div>
      ) : sortedAppointments.length === 0 ? (
        <div className='rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600'>
          No patient appointments found.
        </div>
      ) : (
        <div className='space-y-6'>
          {sortedAppointments.map((appointment) => {
            const patient = appointment.patient_id || {}
            const doctor = appointment.doctor_id || {}
            const payment = getPayment(appointment.id)
            const isPending = appointment.status === 'pending'
            const isRejected = appointment.status === 'cancelled'

            return (
              <div key={appointment.id} className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <p className='text-xl font-semibold text-slate-900'>{patient.full_name || 'Unknown Patient'}</p>
                    <p className='text-sm text-slate-500'>{patient.email || 'No email'}</p>
                    <p className='mt-2 text-sm text-slate-600'>
                      Appointment on <span className='font-semibold'>{new Date(appointment.appointment_date).toLocaleDateString()}</span> at <span className='font-semibold'>{appointment.appointment_time}</span>
                    </p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${appointment.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {appointment.status}
                    </span>
                    {payment && (
                      <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>
                        {payment.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <div className='mt-5 grid gap-4 lg:grid-cols-3'>
                  <div className='rounded-3xl bg-slate-50 p-4'>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>Patient Phone</p>
                    <p className='mt-2 text-sm text-slate-700'>{patient.phone || 'Not provided'}</p>
                  </div>
                  <div className='rounded-3xl bg-slate-50 p-4'>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>Appointment Notes</p>
                    <p className='mt-2 text-sm text-slate-700'>{appointment.notes || 'No notes'}</p>
                  </div>
                  <div className='rounded-3xl bg-slate-50 p-4'>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>Payment</p>
                    <p className='mt-2 text-sm text-slate-700'>
                      {payment ? `${payment.status} • ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(payment.amount)}` : 'No payment recorded'}
                    </p>
                  </div>
                </div>

                <div className='mt-5 space-y-4'>
                  {isRejected && appointment.cancelled_reason && (
                    <div className='rounded-3xl bg-red-50 p-4 text-sm text-red-700'>
                      <p className='font-semibold'>Rejected reason</p>
                      <p className='mt-2'>{appointment.cancelled_reason}</p>
                    </div>
                  )}

                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                    <button
                      disabled={!isPending}
                      onClick={() => handleAccept(appointment)}
                      className={`rounded-full px-6 py-3 text-sm font-semibold text-white ${isPending ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                      Accept
                    </button>
                    <button
                      disabled={!isPending}
                      onClick={() => setRejectAppointmentId(appointment.id)}
                      className={`rounded-full px-6 py-3 text-sm font-semibold ${isPending ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-300 text-slate-600 cursor-not-allowed'}`}
                    >
                      Reject
                    </button>
                  </div>

                  {rejectAppointmentId === appointment.id && (
                    <div className='rounded-3xl border border-red-200 bg-red-50 p-4'>
                      <p className='text-sm font-semibold text-red-700'>Reason for rejection</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className='mt-3 w-full rounded-2xl border border-red-200 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-300'
                        rows={3}
                        placeholder='Type the reason for rejecting this appointment'
                      />
                      <div className='mt-3 flex gap-3 flex-wrap'>
                        <button
                          onClick={() => handleReject(appointment)}
                          className='rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700'
                        >
                          Submit Rejection
                        </button>
                        <button
                          onClick={() => {
                            setRejectAppointmentId('')
                            setRejectReason('')
                          }}
                          className='rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DoctorAppointments
