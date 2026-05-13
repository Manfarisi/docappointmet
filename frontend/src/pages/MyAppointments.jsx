import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'

const MyAppointments = () => {
  const {
    user,
    appointments,
    payments,
    loading,
    fetchAppointments,
    updateAppointmentStatus,
    fetchPayments,
    deleteAppointment
  } = useContext(AppContext)

  const [cancelReason, setCancelReason] = useState('')
  const [cancelingId, setCancelingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      fetchAppointments(user.id, user.user_metadata?.role)
      fetchPayments()
    }
  }, [user])

  const handleCancelStart = (appointmentId) => {
    setCancelingId(appointmentId)
    setCancelReason('')
    setError('')
    setMessage('')
  }

  const handleCancelSubmit = async (appointment) => {
    setError('')
    setMessage('')

    if (!cancelReason.trim()) {
      setError('Please provide a cancellation reason.')
      return
    }

    const result = await updateAppointmentStatus(appointment.id, 'cancelled', cancelReason)
    if (result.success) {
      setMessage('Appointment cancelled successfully.')
      setCancelingId('')
      setCancelReason('')
    } else {
      setError(result.error || 'Unable to cancel appointment.')
    }
  }


  const handleDelete = async (appointmentId) => {
    setError('')
    setMessage('')
    if (!window.confirm('Remove this appointment from your list?')) return
    const result = await deleteAppointment(appointmentId)
    if (result.success) {
      setMessage('Appointment removed.')
    } else {
      setError(result.error || 'Failed to remove appointment.')
    }
  }

  const renderPaymentStatus = (appointmentId) => {
    const payment = payments.find((item) => item.appointment_id === appointmentId)
    if (!payment) return <span className='text-xs text-gray-500'>No payment recorded</span>

    const statusClass = payment.status === 'paid' ? 'text-emerald-600' : payment.status === 'refunded' ? 'text-orange-600' : 'text-amber-600'
    return (
      <div className='text-xs'>
        <span className={`font-medium ${statusClass}`}>Payment:</span> {payment.status}
        {payment.amount != null && <span> • {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(payment.amount)}</span>}
      </div>
    )
  }

  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))

  return (
    <div className='py-8'>
      <div className='mb-6 flex flex-col gap-2'>
        <p className='text-2xl font-semibold text-slate-900'>My Appointments</p>
        <p className='text-sm text-slate-600'>Manage your bookings, payment status, and cancellations.</p>
      </div>

      {error && <div className='mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700'>{error}</div>}
      {message && <div className='mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700'>{message}</div>}

      {loading ? (
        <div className='py-12 text-center text-slate-500'>Loading appointments...</div>
      ) : sortedAppointments.length === 0 ? (
        <div className='rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600'>
          No appointments found.
        </div>
      ) : (
        <div className='space-y-6'>
          {sortedAppointments.map((appt) => {
            const doctor = appt.doctor_id || {}
            const isPatient = user?.user_metadata?.role === 'patient'
            const canCancel = ['pending', 'confirmed'].includes(appt.status) && isPatient
            const isCanceling = cancelingId === appt.id
            return (
              <div key={appt.id} className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                  <div>
                    <p className='text-lg font-semibold text-slate-900'>{doctor.full_name || 'Unknown Doctor'}</p>
                    <p className='text-sm text-slate-500'>{doctor.speciality_id?.name || 'General Physician'}</p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700'>{appt.status}</span>
                    {appt.cancelled_reason && <span className='rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700'>Cancelled</span>}
                  </div>
                </div>



                <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>Appointment</p>
                    <p className='mt-2 text-sm text-slate-800'>{new Date(appt.appointment_date).toLocaleDateString()}</p>
                    <p className='text-sm text-slate-600'>{appt.appointment_time}</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>Doctor fee</p>
                    <p className='mt-2 text-sm text-slate-800'>
                      {doctor.consultation_fee != null ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(doctor.consultation_fee) : 'N/A'}
                    </p>
                    {renderPaymentStatus(appt.id)}
                  </div>
                </div>

                <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>Notes</p>
                    <p className='mt-2 text-sm text-slate-700'>{appt.notes || 'No notes provided.'}</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>Booked by</p>
                    <p className='mt-2 text-sm text-slate-700'>{appt.patient_id?.full_name || 'You'}</p>
                    <p className='text-xs text-slate-500'>{appt.patient_id?.email || user?.email}</p>
                  </div>
                </div>

                {appt.cancelled_reason && (
                  <div className='mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700'>
                    <p className='font-semibold'>Cancel reason</p>
                    <p className='mt-2 text-sm'>{appt.cancelled_reason}</p>
                  </div>
                )}

                {canCancel && (
                  <div className='mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='font-semibold text-slate-900'>Cancel appointment</p>
                    <p className='text-sm text-slate-600 mb-3'>Please tell us why you cancel this booking.</p>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className='w-full rounded-2xl border border-slate-300 bg-white p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-400'
                      rows={4}
                      placeholder='Reason for cancellation'
                    />
                    <div className='mt-3 flex flex-col gap-3 sm:flex-row'>
                      <button
                        onClick={() => handleCancelSubmit(appt)}
                        className='inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700'
                      >
                        {cancelingId === appt.id ? 'Cancelling...' : 'Submit Cancel'}
                      </button>
                      <button
                        onClick={() => setCancelingId('')}
                        className='inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100'
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  {['cancelled', 'completed'].includes(appt.status) && (
                    <div className='mt-4 flex justify-end'>
                      <button
                        onClick={() => handleDelete(appt.id)}
                        className='inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition'
                      >
                        Remove from list
                      </button>
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

export default MyAppointments