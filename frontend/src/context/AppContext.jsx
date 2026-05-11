import { createContext, useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export const AppContext = createContext()

const AppContextProvider = (props) => {
    const currencySymbol = '$'

    const [user, setUser]             = useState(null)
    const [loading, setLoading]       = useState(true)
    const [token, setToken]           = useState(null)
    const [doctors, setDoctors]       = useState([])
    const [specialities, setSpecialities] = useState([])

    // ─── Mapper ────────────────────────────────────────────────
    const mapDoctorRow = (row) => ({
        ...row,
        _id:       row.id,
        name:      row.full_name,
        image:     row.avatar_url || '',
        about:     row.bio || 'No biography available.',
        speciality: row.speciality_id?.name || 'General Physician',
        experience: row.experience_years ? `${row.experience_years} Years` : 'N/A',
        degree:    'MBBS'
    })

    // ─── Fetch ─────────────────────────────────────────────────
    const fetchDoctors = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*, speciality_id(name)')
                .eq('role', 'doctor')
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
    const createDoctor = async (doctorData) => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('users')
                .insert([{ ...doctorData, role: 'doctor' }])

            if (error) throw error
            await fetchDoctors()
            return { success: true }
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

    const register = async (email, password, fullName, role = 'patient') => {
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName, role } }
            })
            if (error) throw error
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

    // ─── Init: session → fetch data ────────────────────────────
    // Satu useEffect, satu alur, satu titik setLoading
    useEffect(() => {
        const init = async () => {
            setLoading(true)
            try {
                const { data: { session } } = await supabase.auth.getSession()
                setUser(session?.user ?? null)
                setToken(session?.access_token ?? null)

                // Fetch data setelah session siap
                await Promise.all([fetchDoctors(), fetchSpecialities()])
            } catch (error) {
                console.error('init:', error.message)
            } finally {
                setLoading(false)
            }
        }

        init()

        // Pantau perubahan auth (login/logout dari tab lain, token refresh, dll)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user ?? null)
                setToken(session?.access_token ?? null)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    // ─── Value ─────────────────────────────────────────────────
    const value = {
        currencySymbol,
        user,
        loading,
        token,
        doctors,
        specialities,
        login,
        register,
        logout,
        fetchDoctors,
        fetchSpecialities,
        createDoctor,
        updateDoctor,
        deleteDoctor
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}

export default AppContextProvider