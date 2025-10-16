/**
 * Supabase Client Configuration
 * 
 * This file initializes and exports Supabase clients for different contexts:
 * - supabase: For client-side usage (respects RLS)
 * - supabaseAdmin: For server-side/admin usage (bypasses RLS)
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase project configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://nlzykbtuyoqfdnqtxdyh.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  console.warn('Warning: SUPABASE_ANON_KEY not set. Client operations may fail.')
}

/**
 * Standard Supabase client for client-side operations
 * - Respects Row Level Security (RLS) policies
 * - Safe to use in frontend applications
 * - Requires user authentication for protected operations
 */
const supabase = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}) : null

/**
 * Admin Supabase client for server-side operations
 * - Bypasses Row Level Security (RLS) policies
 * - Should NEVER be exposed to client-side code
 * - Use only in secure backend environments
 */
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null

/**
 * Helper function to get site URL
 * Useful for authentication redirects and email templates
 */
const getURL = () => {
  let url = process.env.SITE_URL || 
            process.env.NEXT_PUBLIC_SITE_URL || 
            process.env.REACT_APP_SITE_URL || 
            'http://localhost:3000'

  // Ensure URL starts with http/https
  if (!url.startsWith('http')) {
    url = `https://${url}`
  }

  // Ensure URL ends with /
  if (!url.endsWith('/')) {
    url = `${url}/`
  }

  return url
}

/**
 * Example authentication helpers
 */
const authHelpers = {
  /**
   * Sign up a new user
   */
  signUp: async (email, password, metadata = {}) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getURL()}auth/callback`,
        data: metadata
      }
    })
    return { data, error }
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  /**
   * Sign in with magic link (passwordless)
   */
  signInWithMagicLink: async (email) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getURL()}auth/callback`
      }
    })
    return { data, error }
  },

  /**
   * Sign in with OAuth provider (Google, Facebook, etc.)
   */
  signInWithOAuth: async (provider) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getURL()}auth/callback`
      }
    })
    return { data, error }
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  /**
   * Get current user
   */
  getUser: async () => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  /**
   * Reset password
   */
  resetPassword: async (email) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getURL()}auth/reset-password`
    })
    return { data, error }
  },

  /**
   * Update user password
   */
  updatePassword: async (newPassword) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }
}

/**
 * Example database operation helpers
 */
const dbHelpers = {
  /**
   * Get all available rooms
   */
  getAvailableRooms: async () => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_available', true)
      .order('price_per_night', { ascending: true })
    
    return { data, error }
  },

  /**
   * Get user bookings with room details
   */
  getUserBookings: async (userId) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  /**
   * Create a new booking
   */
  createBooking: async (bookingData) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()
    
    return { data, error }
  },

  /**
   * Get user loyalty information
   */
  getUserLoyalty: async (userId) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('loyalty')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    return { data, error }
  },

  /**
   * Subscribe to real-time changes
   */
  subscribeToBookings: (userId, callback) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
    
    return channel
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  getURL,
  authHelpers,
  dbHelpers
}
