import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import RelatedDoctors from '../components/RelatedDoctors'

const Appointment = () => {
  const { docId } = useParams()
  const navigate = useNavigate()
  const {
    user,
    doctors,
    currencySymbol,
    createAppointment,
    appointments
  } = useContext(AppContext)

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const formatTime = (val) => val.replace('.', ':')


  const [docInfo, setDocInfo] = useState(null)
  const [docSlots, setDocSlots] = useState([])
  const [slotIndex, setSlotIndex] = useState(0)
  const [slotTime, setSlotTime] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const fetchDocInfo = async () => {
    const docInfo = doctors.find(doc => doc._id === docId)
    setDocInfo(docInfo)
  }

  const getAvailableSlots = async () => {
    setDocSlots([])

    // getting current date
    let today = new Date()

    for (let i = 0; i < 7; i++) {
      let currentDate = new Date(today)
      currentDate.setDate(today.getDate() + i)

      let endTime = new Date(today)
      endTime.setDate(today.getDate() + i)
      endTime.setHours(21, 0, 0, 0)

      if (today.getDate() === currentDate.getDate()) {
        currentDate.setHours(currentDate.getHours() > 10 ? currentDate.getHours() + 1 : 10)
        currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0)
      } else {
        currentDate.setHours(10)
        currentDate.setMinutes(0)
      }

      let timeSlots = []

      while (currentDate < endTime) {
let formattedTime = currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        timeSlots.push({
          datetime: new Date(currentDate),
          time: formattedTime
        })
        currentDate.setMinutes(currentDate.getMinutes() + 30)
      }

      setDocSlots(prev => ([...prev, timeSlots]))
    }
  }

  const handleBooking = async () => {
    setError('')
    setMessage('')

    if (!user) {
      setError('Please login before booking an appointment.')
      return
    }

    if (!slotTime || !docSlots[slotIndex] || docSlots[slotIndex].length === 0) {
      setError('Please select a valid time slot.')
      return
    }

    const bookingDate = docSlots[slotIndex][0].datetime.toISOString().slice(0, 10)

    const payload = {
      patient_id: user.id,
      doctor_id: docId,
      appointment_date: bookingDate,
      appointment_time: slotTime,
      notes: notes.trim() || null,
      status: 'pending',
    }

    const result = await createAppointment(payload)
    if (result.success) {
      setMessage('Appointment booked successfully!')
      setNotes('')
      navigate('/my-appointments')
    } else {
      setError(result.error || 'Failed to book appointment. Please try another slot.')
    }
  }

  useEffect(() => {
    fetchDocInfo()
  }, [doctors, docId])

  useEffect(() => {
    if (docInfo) {
      getAvailableSlots()
    }
  }, [docInfo])

  useEffect(() => {
    if (docSlots[slotIndex] && docSlots[slotIndex][0]) {
      setSlotTime(docSlots[slotIndex][0].time)
    }
  }, [docSlots, slotIndex])


  return docInfo && (
    <div>
      {/* Doctor Details */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <div>
          {docInfo.image ? (
            <img className='bg-green-200 w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt={docInfo.name} />
          ) : (
            <div className='bg-green-200 w-full sm:max-w-72 rounded-lg h-72 flex items-center justify-center text-gray-600'>
              No image available
            </div>
          )}
        </div>

        <div className='flex-1 border border-gray-400 rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[80px] sm:mt-0'>
          {/* info doctor */}
          <p className='flex items-center gap-2 text-2xl font-medium text-gray-900'>
            {docInfo.name}
             <span className='text-green-500'>✔</span>
          </p>
        

        <div className='flex items-center gap-2 text-sm mt-1 text-gray-600'>
          <p>{docInfo.degree} - {docInfo.speciality}</p>
          <button className='py-0.5 px-2 border text-xs rounded-full'>{docInfo.experience}</button>
        </div>

        {/* About Doctor */}
        <div>
          <p className='flex items-center gap-1 text-sm font-medium text-gray-900 mt-3'>About <span className='text-gray-400'>i</span></p>
          <p className='text-sm text-gray-500 max-w-[700px] mt-1'>{docInfo.about}</p>
        </div>

      </div>
    </div>

    {/* bOOKING SLOTS */}
    <div className='sm:ml-72 sm:pl-4 mt-4 font-medium text-gray-700'>
        <p>Booking slots</p>
        <div className='flex gap-3 items-center w-full overflow-x-scroll mt-4'>
          {
            docSlots.length && docSlots.map((item,index)=>(
              <div onClick={()=> setSlotIndex(index)} className={`text-center py-6 min-w-16 rounded-full cursor-pointer ${slotIndex === index ? 'bg-green-400 text-white' : 'border border-gray-200'}`} key={index}>
                <p>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
                <p>{item[0] && item[0].datetime.getDate()}</p>
              </div>
            ))
          }
        </div>
    

    <div className='flex items-center gap-3 w-full overflow-x-scroll mt-4'>
      {
        docSlots.length && docSlots[slotIndex]?.map((item,index)=>(
          <p
            onClick={() => setSlotTime(item.time)}
            className={`text-sm flex shrink-0 px-5 py-2 rounded-full cursor-pointer ${item.time === slotTime ? 'bg-green-400 text-black' : 'text-gray-700 border border-gray-600'}`}
            key={index}
          >
            {item.time.toLowerCase()}
          </p>
        ))
      }
    </div>

    <div className='mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-4'>
      <div>
        <label className='block text-sm font-medium text-slate-700'>Notes for doctor</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className='mt-2 w-full rounded-3xl border border-slate-300 bg-white p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-400'
          rows={4}
          placeholder='Enter any symptoms or questions you want to discuss.'
        />
      </div>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='text-sm text-slate-600'>
          Selected slot: <span className='font-semibold text-slate-900'>{slotTime || 'None'}</span>
        </div>
        <button
          onClick={handleBooking}
          className='inline-flex items-center justify-center rounded-full bg-green-500 px-8 py-3 text-sm font-semibold text-white hover:bg-green-600 transition'
        >
          Book Appointment
        </button>
      </div>
      {error && <p className='text-sm text-red-600'>{error}</p>}
      {message && <p className='text-sm text-emerald-600'>{message}</p>}
    </div>
    </div>
    {/* Related Doctors */}
    <RelatedDoctors docId={docId} speciality={docInfo.speciality}/>
    </div>
  )
}

export default Appointment