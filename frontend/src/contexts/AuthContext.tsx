import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === 'true'

const MOCK_PROFILE: UserProfile = {
  id: 'mock-user-id',
  alias: 'Jugador Demo',
  email: 'demo@porra2026.com',
  is_admin: true,
}
const MOCK_USER = {
  id: 'mock-user-id',
  email: 'demo@porra2026.com',
  user_metadata: { alias: 'Jugador Demo', is_admin: true },
} as unknown as User
const MOCK_SESSION = { user: MOCK_USER } as unknown as Session

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  isAdmin: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, alias: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Los hooks siempre se llaman — nunca condicionalmente
  const [session, setSession] = useState<Session | null>(
    AUTH_DISABLED ? MOCK_SESSION : null
  )
  const [profile, setProfile] = useState<UserProfile | null>(
    AUTH_DISABLED ? MOCK_PROFILE : null
  )
  const [isLoading, setIsLoading] = useState(!AUTH_DISABLED)

  useEffect(() => {
    if (AUTH_DISABLED) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) fetchProfile(s)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(s: Session) {
    const { data } = await supabase
      .from('profiles')
      .select('id, alias, is_admin, avatar_url')
      .eq('id', s.user.id)
      .maybeSingle()

    if (data) {
      setProfile({
        id: data.id,
        alias: data.alias,
        email: s.user.email ?? '',
        is_admin: data.is_admin,
        avatar_url: data.avatar_url ?? undefined,
      })
      return
    }

    // El trigger no creó el perfil aún: lo creamos aquí como fallback
    const meta = s.user.user_metadata as Record<string, unknown>
    const alias = ((meta.alias as string) ?? s.user.email?.split('@')[0] ?? 'Usuario').slice(0, 30)

    const { data: created } = await supabase
      .from('profiles')
      .upsert({ id: s.user.id, alias })
      .select('id, alias, is_admin, avatar_url')
      .maybeSingle()

    setProfile({
      id: s.user.id,
      alias: created?.alias ?? alias,
      email: s.user.email ?? '',
      is_admin: created?.is_admin ?? false,
      avatar_url: created?.avatar_url ?? undefined,
    })
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  async function signUp(email: string, password: string, alias: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { alias } },
    })
    if (error) throw new Error(error.message)
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
  }

  async function signInWithMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: AUTH_DISABLED ? true : (profile?.is_admin ?? false),
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
