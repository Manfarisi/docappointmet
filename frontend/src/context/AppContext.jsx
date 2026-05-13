import { createContext, useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export const AppContext = createContext()

const AppContextProvider = (props) => {
    const currencySymbol = '$'

    const [user, setUser]                   = useState(null)
    const [loading, setLoading]             = useState(true)
    const [token, setToken]                 = useState(null)
    const [doctors, setDoctors]             = useState([])
    const [specialities, setSpecialities]   = useState([])
    const [appointments, setAppointments]   = useState([])
    const [payments, setPayments]           = useState([])
    const [reviews, setReviews]             = useState([])
    const [notifications, setNotifications] = useState([])

    // ─── Mapper ────────────────────────────────────────────────
    const mapDoctorRow = (row) => ({
        ...row,
        _id:       row.id,
        name:      row.full_name,
        image:     row.avatar_url || '',
        about:     row.bio || 'No biography available.',
        speciality: row.speciality_id?.name || 'General Physician',
        experience: row.experience_years ? `${row.experience_years} Years` : 'N/A',
        degree:    'MBBS',
        fee:       row.consultation_fee || 0
    })

    // ─── Fetch ─────────────────────────────────────────────────
    const fetchDoctors = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*, speciality_id(name)')
                .eq('role', 'doctor')
                .eq('is_active', true)
                .order('full_name', { ascending: true })

            if (error) throw error
            setDoctors((data ?? []).map(mapDoctorRow))
            return { success: true }
        } catch (error) {
            console.error('fetchDoctors:', error.message)
            return { success: false, error: error.message }
        }
    }

    const fetchSpecialities = async () => {
        try {
            const { data, error } = await supabase
                .from('specialities')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            setSpecialities(data ?? [])
            return { success: true }
        } catch (error) {
            console.error('fetchSpecialities:', error.message)
            return { success: false, error: error.message }
        }
    }

    // ─── Doctor CRUD ───────────────────────────────────────────
    const API_URL = import.meta.env.VITE_API_URL || ''

    const createDoctor = async (doctorData) => {
        setLoading(true)
        try {
            if (!API_URL) throw new Error('Server API URL is not configured.')

            const headers = { 'Content-Type': 'application/json' }
            if (import.meta.env.VITE_ADMIN_SECRET) headers['x-admin-secret'] = import.meta.env.VITE_ADMIN_SECRET

            const response = await fetch(`${API_URL}/create-doctor`, {
                method: 'POST',
                headers,
                body: JSON.stringify(doctorData)
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to create doctor')

            await fetchDoctors()
            return { success: true, data }
        } catch (error) {
            console.error('createDoctor:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const updateDoctor = async (id, doctorData) => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('users')
                .update(doctorData)
                .eq('id', id)

            if (error) throw error
            await fetchDoctors()
            return { success: true }
        } catch (error) {
            console.error('updateDoctor:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const deleteDoctor = async (id) => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id)

            if (error) throw error
            await fetchDoctors()
            return { success: true }
        } catch (error) {
            console.error('deleteDoctor:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    // ─── Appointments ──────────────────────────────────────────
    const fetchAppointments = async (userId = null, role = null) => {
        try {
            let query = supabase
                .from('appointments')
                .select('*, patient_id(full_name, email, phone), doctor_id(full_name, speciality_id(name), consultation_fee)')

            // Jika userId diberikan, filter berdasarkan role
            if (userId && role === 'patient') {
                query = query.eq('patient_id', userId)
            } else if (userId && role === 'doctor') {
                query = query.eq('doctor_id', userId)
            }

            const { data, error } = await query.order('appointment_date', { ascending: false })

            if (error) throw error
            setAppointments(data ?? [])
            return { success: true, data }
        } catch (error) {
            console.error('fetchAppointments:', error.message)
            return { success: false, error: error.message }
        }
    }

    const createAppointment = async (appointmentData) => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('appointments')
                .insert([appointmentData])
                .select()

            if (error) throw error
            setAppointments(prev => [data[0], ...prev])
            return { success: true, data: data[0] }
        } catch (error) {
            console.error('createAppointment:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const updateAppointmentStatus = async (appointmentId, status, cancelledReason = null) => {
        setLoading(true)
        try {
            const updateData = { status }
            if (status === 'cancelled' && cancelledReason) {
                updateData.cancelled_reason = cancelledReason
                updateData.cancelled_by = user?.id
            }

            const { error } = await supabase
                .from('appointments')
                .update(updateData)
                .eq('id', appointmentId)

            if (error) throw error
            await fetchAppointments(user?.id, user?.user_metadata?.role)
            return { success: true }
        } catch (error) {
            console.error('updateAppointmentStatus:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    // ─── Reviews ───────────────────────────────────────────────
    const fetchReviews = async (doctorId = null) => {
        try {
            let query = supabase
                .from('reviews')
                .select('*, patient_id(full_name, avatar_url)')

            if (doctorId) {
                query = query.eq('doctor_id', doctorId)
            }

            const { data, error } = await query.order('created_at', { ascending: false })

            if (error) throw error
            setReviews(data ?? [])
            return { success: true, data }
        } catch (error) {
            console.error('fetchReviews:', error.message)
            return { success: false, error: error.message }
        }
    }

    const createReview = async (appointmentId, rating, comment = '') => {
        setLoading(true)
        try {
            // Cek appointment details
            const { data: apptData, error: apptError } = await supabase
                .from('appointments')
                .select('patient_id, doctor_id, status')
                .eq('id', appointmentId)
                .single()

            if (apptError || !apptData) throw new Error('Appointment not found')
            if (apptData.status !== 'completed') throw new Error('Can only review completed appointments')

            const reviewData = {
                appointment_id: appointmentId,
                patient_id: apptData.patient_id,
                doctor_id: apptData.doctor_id,
                rating,
                comment
            }

            const { data, error } = await supabase
                .from('reviews')
                .insert([reviewData])
                .select()

            if (error) throw error
            setReviews(prev => [data[0], ...prev])
            return { success: true, data: data[0] }
        } catch (error) {
            console.error('createReview:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    // ─── Payments ──────────────────────────────────────────────
    const fetchPayments = async (appointmentId = null) => {
    try {
        let query = supabase
            .from('payments')
            .select('*')  // ← cukup ini, tidak perlu join

        if (appointmentId) query = query.eq('appointment_id', appointmentId)

        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) throw error
        setPayments(data ?? [])
        return { success: true, data }
    } catch (error) {
        console.error('fetchPayments:', error.message)
        return { success: false, error: error.message }
    }
}

    const createPayment = async (appointmentId, amount, method = 'cash') => {
        setLoading(true)
        try {
            const paymentData = {
                appointment_id: appointmentId,
                amount,
                method,
                status: 'unpaid'
            }

            const { data, error } = await supabase
                .from('payments')
                .insert([paymentData])
                .select()

            if (error) throw error
            setPayments(prev => [...prev, data[0]])
            return { success: true, data: data[0] }
        } catch (error) {
            console.error('createPayment:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const updatePaymentStatus = async (paymentId, status, paidAt = null) => {
        setLoading(true)
        try {
            const updateData = { status }
            if (status === 'paid') {
                updateData.paid_at = paidAt || new Date().toISOString()
            }

            const { error } = await supabase
                .from('payments')
                .update(updateData)
                .eq('id', paymentId)

            if (error) throw error
            
            // Update local state
            setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, ...updateData } : p))
            return { success: true }
        } catch (error) {
            console.error('updatePaymentStatus:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    // ─── Notifications ────────────────────────────────────────
    const fetchNotifications = async () => {
        try {
            if (!user?.id) return { success: true, data: [] }

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setNotifications(data ?? [])
            return { success: true, data }
        } catch (error) {
            console.error('fetchNotifications:', error.message)
            return { success: false, error: error.message }
        }
    }

    const markNotificationAsRead = async (notificationId) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)

            if (error) throw error
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))
            return { success: true }
        } catch (error) {
            console.error('markNotificationAsRead:', error.message)
            return { success: false, error: error.message }
        }
    }

    const markAllNotificationsAsRead = async () => {
        try {
            if (!user?.id) return { success: false }

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false)

            if (error) throw error
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            return { success: true }
        } catch (error) {
            console.error('markAllNotificationsAsRead:', error.message)
            return { success: false, error: error.message }
        }
    }

    // ─── Auth ──────────────────────────────────────────────────
    const login = async (email, password) => {
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            console.error('login:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const register = async (email, password,phone, fullName, role = 'patient') => {
    setLoading(true)
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            phone,
            options: { data: { full_name: fullName, role } }
        })
        if (error) throw error

        // ← Tambahkan ini: insert ke public.users manual
        if (data.user) {
            const { error: profileError } = await supabase
                .from('users')
                .insert([{
                    id:        data.user.id,
                    email:     email,
                    full_name: fullName,
                    phone:     phone,
                    role:      role
                }])

            // Tidak throw, biarkan lanjut meski insert gagal
            if (profileError) console.warn('profile insert:', profileError.message)
        }

        return { success: true, data }
    } catch (error) {
        console.error('register:', error.message)
        return { success: false, error: error.message }
    } finally {
        setLoading(false)
    }
}

    const logout = async () => {
        setLoading(true)
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            return { success: true }
        } catch (error) {
            console.error('logout:', error.message)
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const deleteAppointment = async (appointmentId) => {
    setLoading(true)
    try {
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', appointmentId)

        if (error) throw error
        setAppointments(prev => prev.filter(a => a.id !== appointmentId))
        return { success: true }
    } catch (error) {
        console.error('deleteAppointment:', error.message)
        return { success: false, error: error.message }
    } finally {
        setLoading(false)
    }
}

    // ─── Init: session → fetch data ────────────────────────────
    useEffect(() => {
        const init = async () => {
            setLoading(true)
            try {
                const { data: { session } } = await supabase.auth.getSession()
                setUser(session?.user ?? null)
                setToken(session?.access_token ?? null)

                // Fetch data setelah session siap
                await Promise.all([
                    fetchDoctors(),
                    fetchSpecialities(),
                    ...(session?.user ? [
                        fetchAppointments(session.user.id, session.user.user_metadata?.role),
                        fetchPayments(),
                        fetchNotifications()
                    ] : [])
                ])
            } catch (error) {
                console.error('init:', error.message)
            } finally {
                setLoading(false)
            }
        }

        init()

        // Pantau perubahan auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user ?? null)
                setToken(session?.access_token ?? null)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        if (!user) {
            setAppointments([])
            setPayments([])
            setNotifications([])
            return
        }

        fetchAppointments(user.id, user.user_metadata?.role)
        fetchPayments()
        fetchNotifications()
    }, [user])

    // ─── Value ─────────────────────────────────────────────────
    const value = {
        currencySymbol,
        user,
        loading,
        token,
        doctors,
        specialities,
        appointments,
        payments,
        reviews,
        notifications,
        login,
        register,
        logout,
        fetchDoctors,
        fetchSpecialities,
        createDoctor,
        updateDoctor,
        deleteDoctor,
        fetchAppointments,
        createAppointment,
        updateAppointmentStatus,
        fetchReviews,
        createReview,
        fetchPayments,
        createPayment,
        updatePaymentStatus,
        fetchNotifications,
        markNotificationAsRead,
        deleteAppointment,
        markAllNotificationsAsRead
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}

export default AppContextProvider