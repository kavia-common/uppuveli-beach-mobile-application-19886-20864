import { useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

export default function AuthCallback({ onSuccessNavigate }) {
  useEffect(() => {
    const handle = async () => {
      try {
        const { data, error } = await supabase.auth.getSessionFromUrl()
        if (error) {
          console.error('Auth callback error:', error)
          if (onSuccessNavigate) onSuccessNavigate('/auth/error')
          return
        }
        if (data?.session) {
          if (onSuccessNavigate) onSuccessNavigate('/dashboard')
        }
      } catch (e) {
        console.error('Auth callback exception:', e)
        if (onSuccessNavigate) onSuccessNavigate('/auth/error')
      }
    }
    handle()
  }, [onSuccessNavigate])

  return <div>Processing authentication...</div>
}
