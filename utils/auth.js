import { supabase } from './supabaseClient'
import { getURL } from './getURL'

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getURL()}auth/callback`,
    },
  })
  return { data, error }
}

export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getURL()}auth/reset-password`,
  })
  return { data, error }
}

export const signInWithMagicLink = async (email) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getURL()}auth/callback`,
    },
  })
  return { data, error }
}

export const signInWithOAuth = async (provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${getURL()}auth/callback`,
    },
  })
  return { data, error }
}

export const handleAuthError = (error, routerPush) => {
  if (!error) return
  console.error('Authentication error:', error)
  const message = error?.message || ''
  if (message.includes('redirect')) {
    routerPush && routerPush('/auth/error?type=redirect')
  } else if (message.includes('email')) {
    routerPush && routerPush('/auth/error?type=email')
  } else {
    routerPush && routerPush('/auth/error')
  }
}
