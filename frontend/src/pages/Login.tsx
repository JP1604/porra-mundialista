import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trophy, Mail, Lock, User, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

type Mode = 'login' | 'register'

export function Login() {
  const { session, isLoading, signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode]       = useState<Mode>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [alias, setAlias]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!isLoading && session) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email || !password) {
      setError('Completa el correo y la contraseña.')
      return
    }
    if (mode === 'register' && !alias.trim()) {
      setError('Elige un alias para tu cuenta.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, alias.trim())
        setSuccess('¡Cuenta creada! Revisa tu correo para confirmar el registro.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'pl-9 bg-slate-100 dark:bg-[#1E293B] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:ring-[#00D084] focus-visible:border-[#00D084]/40'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(0,208,132,0.10)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,rgba(245,158,11,0.05)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-sm flex flex-col gap-4 animate-fade-in">
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#F59E0B]/20 blur-xl scale-150" />
              <Trophy className="relative w-12 h-12 text-[#F59E0B]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Porra <span className="text-[#00D084]">2026</span>
            </h1>
            <p className="text-slate-500 text-xs">Mundial USA–Canadá–México</p>
          </div>

          {/* Tabs */}
          <div className="flex w-full bg-slate-100 dark:bg-[#1E293B] rounded-lg p-1 gap-1">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-150
                  ${mode === m
                    ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.08]'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 w-full bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2.5 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="w-full bg-[#00D084]/10 border border-[#00D084]/20 rounded-lg px-3 py-2.5 text-sm text-[#00D084]">
              {success}
            </div>
          )}

          {/* Form */}
          <form className="w-full flex flex-col gap-3" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Alias (ej. ElCrack10)"
                  value={alias}
                  onChange={e => setAlias(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              <Input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={submitting}
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              <Input
                type={showPass ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={submitting}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#00D084] hover:bg-[#00b872] text-[#070C18] font-bold mt-1 shadow-[0_0_20px_rgba(0,208,132,0.25)] transition-all hover:shadow-[0_0_28px_rgba(0,208,132,0.35)]"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-[11px] text-slate-600 font-medium">o continúa con</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {/* Google button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => signInWithGoogle().catch(e => setError(e.message))}
            className="w-full bg-transparent border-slate-200 dark:border-white/[0.12] text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/[0.05] gap-2.5 font-medium"
          >
            {/* Google SVG icon (no emojis per skill guidelines) */}
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </Button>

          <p className="text-xs text-slate-500 text-center">
            {mode === 'login' ? (
              <>¿No tienes cuenta?{' '}
                <button type="button" onClick={() => setMode('register')}
                  className="text-[#00D084] hover:underline font-medium">
                  Regístrate
                </button>
              </>
            ) : (
              <>¿Ya tienes cuenta?{' '}
                <button type="button" onClick={() => setMode('login')}
                  className="text-[#00D084] hover:underline font-medium">
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
