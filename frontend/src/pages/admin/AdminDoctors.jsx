import React, { useContext, useEffect, useRef, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import { supabase } from '../../utils/supabaseClient'

const defaultForm = {
  full_name: '', email: '', password: '', confirmPassword: '', phone: '',
  speciality_id: '', experience_years: 0, consultation_fee: 0,
  bio: '', avatar_url: ''
}

const StatCard = ({ label, value, icon, color }) => (
  <div className='rounded-2xl p-5 flex items-center gap-4 bg-white border border-gray-100 shadow-sm'>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
    <div>
      <p className='text-2xl font-bold text-gray-800'>{value}</p>
      <p className='text-xs text-gray-500 uppercase tracking-wider'>{label}</p>
    </div>
  </div>
)

const AdminDoctors = () => {
  const { doctors, specialities, loading, fetchDoctors, createDoctor, updateDoctor, deleteDoctor } = useContext(AppContext)

  const [formData, setFormData]   = useState(defaultForm)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [message, setMessage]     = useState('')
  const [error, setError]         = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [search, setSearch]       = useState('')

  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [uploading, setUploading]         = useState(false)
  const fileInputRef                      = useRef(null)

  useEffect(() => { fetchDoctors() }, [])

  const resetForm = () => {
    setFormData(defaultForm)
    setEditingId(''); setIsEditing(false)
    setError(''); setMessage('')
    setAvatarFile(null); setAvatarPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('File harus berupa gambar.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Ukuran gambar maksimal 2MB.'); return }
    setError('')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setFormData(prev => ({ ...prev, avatar_url: '' }))
  }

  const uploadAvatar = async (file) => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const filePath = `doctors/doctor_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      return data.publicUrl
    } catch (err) {
      throw new Error('Gagal upload avatar: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setMessage('')
    if (!formData.full_name || !formData.email || !formData.speciality_id) {
      setError('Nama, email, dan spesialitas wajib diisi.'); return
    }
    if (!isEditing) {
      if (!formData.password) {
        setError('Password dokter wajib diisi saat menambahkan dokter.'); return
      }
      if (formData.password.length < 8) {
        setError('Password minimal 8 karakter.'); return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Password dan konfirmasi password tidak cocok.'); return
      }
    }

    try {
      let avatarUrl = formData.avatar_url
      if (avatarFile) avatarUrl = await uploadAvatar(avatarFile)
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        speciality_id: formData.speciality_id,
        experience_years: Number(formData.experience_years) || 0,
        consultation_fee: Number(formData.consultation_fee) || 0,
        bio: formData.bio,
        avatar_url: avatarUrl,
        ...(isEditing ? {} : { password: formData.password })
      }
      const result = await (isEditing ? updateDoctor(editingId, payload) : createDoctor(payload))
      if (result.success) {
        setMessage(isEditing ? 'Dokter berhasil diupdate.' : 'Dokter berhasil ditambahkan.')
        resetForm(); setShowForm(false)
      } else {
        setError(result.error || 'Gagal menyimpan data dokter.')
      }
    } catch (err) { setError(err.message) }
  }

  const handleEdit = (doctor) => {
    setFormData({
      full_name: doctor.full_name,
      email: doctor.email,
      password: '',
      confirmPassword: '',
      phone: doctor.phone ?? '',
      speciality_id: doctor.speciality_id?.id || '',
      experience_years: doctor.experience_years ?? 0,
      consultation_fee: doctor.consultation_fee ?? 0,
      bio: doctor.bio ?? '',
      avatar_url: doctor.avatar_url ?? ''
    })
    setAvatarPreview(doctor.avatar_url ?? '')
    setAvatarFile(null); setEditingId(doctor.id)
    setIsEditing(true); setShowForm(true)
    setMessage(''); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    setError(''); setMessage('')
    if (!window.confirm('Yakin ingin menghapus dokter ini?')) return
    const result = await deleteDoctor(id)
    result.success ? setMessage('Dokter berhasil dihapus.') : setError(result.error || 'Gagal menghapus.')
  }

  const filtered = doctors.filter(d =>
    d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.speciality_id?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const specialityCount = [...new Set(doctors.map(d => d.speciality_id?.name).filter(Boolean))].length
  const recentCount = doctors.filter(d => (new Date() - new Date(d.created_at)) / 86400000 <= 7).length

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Top bar */}
      <div className='bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center'>
            <span className='text-white text-sm font-bold'>DA</span>
          </div>
          <div>
            <h1 className='text-sm font-semibold text-gray-800'>Doctor Management</h1>
            <p className='text-xs text-gray-400'>Admin Panel · DocAppointment</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className='flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-xl transition font-medium shadow-sm'
        >
          <span className='text-base leading-none'>＋</span> Add Doctor
        </button>
      </div>

      <div className='max-w-6xl mx-auto px-6 py-8'>

        {/* Alerts */}
        {message && (
          <div className='mb-5 flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm'>
            ✓ {message}
          </div>
        )}
        {error && (
          <div className='mb-5 flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm'>
            ✕ {error}
          </div>
        )}

        {/* Stat cards */}
        <div className='grid grid-cols-3 gap-4 mb-8'>
          <StatCard label='Total Doctors'   value={doctors.length}  icon='👨‍⚕️' color='bg-blue-50 text-blue-500' />
          <StatCard label='Specialities'    value={specialityCount} icon='🏥'  color='bg-purple-50 text-purple-500' />
          <StatCard label='Added This Week' value={recentCount}     icon='🆕'  color='bg-green-50 text-green-500' />
        </div>

        {/* Form Panel */}
        {showForm && (
          <div className='mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50'>
              <div>
                <h2 className='font-semibold text-gray-800 text-sm'>
                  {isEditing ? '✏️  Edit Doctor' : '➕  Add New Doctor'}
                </h2>
                <p className='text-xs text-gray-400 mt-0.5'>Field bertanda * wajib diisi</p>
              </div>
              <button onClick={() => { resetForm(); setShowForm(false) }}
                className='w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-light transition'>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className='p-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                {[
                  { label: 'Full Name *',  key: 'full_name',  type: 'text',   placeholder: 'dr. John Doe' },
                  { label: 'Email *',      key: 'email',      type: 'email',  placeholder: 'doctor@email.com' },
                  { label: 'Phone',        key: 'phone',      type: 'text',   placeholder: '+62 812 3456 7890' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} className='flex flex-col gap-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>{label}</label>
                    <input type={type} placeholder={placeholder}
                      className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition'
                      value={formData[key]}
                      onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Speciality *</label>
                  <select value={formData.speciality_id}
                    onChange={e => setFormData(p => ({ ...p, speciality_id: e.target.value }))}
                    className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition'>
                    <option value=''>Choose speciality</option>
                    {specialities.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                </div>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Consultation Fee</label>
                  <input type='number' min='0' placeholder='0'
                    className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition'
                    value={formData.consultation_fee}
                    onChange={e => setFormData(p => ({ ...p, consultation_fee: e.target.value }))} />
                </div>
                {!isEditing && (
                  <>
                    <div className='flex flex-col gap-1.5'>
                      <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Password *</label>
                      <input type='password' placeholder='Password untuk login dokter'
                        className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition'
                        value={formData.password}
                        onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Confirm Password *</label>
                      <input type='password' placeholder='Confirm password'
                        className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition'
                        value={formData.confirmPassword}
                        onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))} />
                    </div>
                  </>
                )}
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Experience (Years)</label>
                  <input type='number' min='0'
                    className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition'
                    value={formData.experience_years}
                    onChange={e => setFormData(p => ({ ...p, experience_years: Number(e.target.value) }))} />
                </div>

                {/* Avatar Upload */}
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Avatar Photo</label>
                  <div className='flex items-center gap-3'>
                    <div className='w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0'>
                      {avatarPreview
                        ? <img src={avatarPreview} alt='preview' className='w-full h-full object-cover' />
                        : <span className='text-gray-300 text-lg'>📷</span>
                      }
                    </div>
                    <div className='flex-1'>
                      <button type='button' onClick={() => fileInputRef.current?.click()}
                        className='w-full border border-dashed border-gray-300 hover:border-green-400 rounded-xl px-3 py-2.5 text-xs text-gray-500 hover:text-green-600 transition text-left'>
                        {avatarFile ? `✓ ${avatarFile.name}` : 'Click to upload image...'}
                      </button>
                      <input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={handleFileChange} />
                      <p className='text-xs text-gray-400 mt-1'>JPG, PNG, WEBP · max 2MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className='flex flex-col gap-1.5 mt-5'>
                <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Bio</label>
                <textarea rows='3'
                  className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition resize-none'
                  placeholder='Short description about the doctor...'
                  value={formData.bio}
                  onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} />
              </div>

              <div className='mt-5 flex gap-3'>
                <button type='submit' disabled={loading || uploading}
                  className='bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm px-6 py-2.5 rounded-xl font-medium transition shadow-sm'>
                  {uploading ? '⏳ Uploading...' : loading ? '⏳ Saving...' : isEditing ? '✓ Update Doctor' : '✓ Save Doctor'}
                </button>
                <button type='button' onClick={() => { resetForm(); setShowForm(false) }}
                  className='border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm px-6 py-2.5 rounded-xl transition'>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className='bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100'>
            <div>
              <h2 className='font-semibold text-gray-800 text-sm'>All Doctors</h2>
              <p className='text-xs text-gray-400'>{doctors.length} doctor{doctors.length !== 1 ? 's' : ''} registered</p>
            </div>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs'>🔍</span>
              <input type='text' placeholder='Search name, email, speciality...'
                className='pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition'
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className='flex flex-col items-center justify-center py-20 text-gray-400 text-sm gap-3'>
              <div className='w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin' />
              Loading doctors...
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
              <span className='text-4xl mb-3'>👨‍⚕️</span>
              <p className='text-sm font-medium'>No doctors found</p>
              <p className='text-xs mt-1'>{search ? 'Try a different search term' : 'Click "+ Add Doctor" to get started'}</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-gray-50 border-b border-gray-100'>
                    {['Doctor', 'Speciality', 'Phone', 'Experience', 'Joined', ''].map(h => (
                      <th key={h} className='text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider'>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50'>
                  {filtered.map(doctor => (
                    <tr key={doctor.id} className='hover:bg-gray-50 transition'>
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-9 h-9 rounded-xl bg-green-100 overflow-hidden flex items-center justify-center text-green-700 font-bold shrink-0'>
                            {doctor.avatar_url
                              ? <img src={doctor.avatar_url} alt={doctor.full_name} className='w-full h-full object-cover' />
                              : doctor.full_name?.[0]?.toUpperCase() || 'D'
                            }
                          </div>
                          <div>
                            <p className='font-medium text-gray-800'>{doctor.full_name}</p>
                            <p className='text-xs text-gray-400'>{doctor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <span className='inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium'>
                          {doctor.speciality_id?.name || '—'}
                        </span>
                      </td>
                      <td className='px-6 py-4 text-gray-500 text-xs'>{doctor.phone || '—'}</td>
                      <td className='px-6 py-4'>
                        <span className='font-medium text-gray-700'>{doctor.experience_years ?? '—'}</span>
                        <span className='text-gray-400 text-xs'> yrs</span>
                      </td>
                      <td className='px-6 py-4 text-gray-400 text-xs'>
                        {new Date(doctor.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-2 justify-end'>
                          <button onClick={() => handleEdit(doctor)}
                            className='px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 text-xs font-medium transition'>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(doctor.id)}
                            className='px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-medium transition'>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDoctors