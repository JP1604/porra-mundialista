import { NavLink, Link, useNavigate } from 'react-router-dom'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Home,
  Calendar,
  ClipboardList,
  BarChart3,
  Shield,
  LogOut,
  User,
  Trophy,
  X,
  ChevronUp,
} from 'lucide-react'

const NAV_LINKS = [
  { to: '/',            label: 'Inicio',        icon: Home,          end: true },
  { to: '/fixture',     label: 'Fixture',       icon: Calendar,      end: false },
  { to: '/porra',       label: 'Mi Porra',      icon: ClipboardList, end: false },
  { to: '/leaderboard', label: 'Clasificación', icon: BarChart3,     end: false },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full w-60 z-30 flex flex-col',
        'border-r transition-transform duration-200 ease-in-out',
        'md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <Link to="/" onClick={onClose} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center ring-1 ring-[#F59E0B]/20">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="leading-tight">
            <p className="font-black text-slate-900 dark:text-white text-sm tracking-tight">Porra 2026</p>
            <p className="text-[10px] text-slate-500">Mundial USA·CAN·MEX</p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={onClose}
            className="md:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          Menú
        </p>

        {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#00D084]/12 text-[#00D084] border border-[#00D084]/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-transparent',
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 mt-5 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
              Administración
            </p>
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#F59E0B]/12 text-[#F59E0B] border border-[#F59E0B]/20'
                    : 'text-slate-500 hover:text-[#F59E0B] hover:bg-[#F59E0B]/5 border border-transparent',
                )
              }
            >
              <Shield className="w-4 h-4 shrink-0" />
              Panel Admin
            </NavLink>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
        {profile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors text-left group">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-[#00D084]/15 text-[#00D084] text-xs font-bold">
                    {getInitials(profile.alias)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">
                    {profile.alias}
                  </p>
                  <p className="text-xs text-slate-500 truncate leading-tight">
                    {profile.email}
                  </p>
                </div>
                <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-slate-300 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-52 bg-[#111827] border-white/10 text-slate-200 shadow-xl mb-1"
            >
              <DropdownMenuItem
                onClick={() => { navigate(`/profile/${profile.id}`); onClose() }}
                className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
              >
                <User className="w-4 h-4 mr-2 text-slate-400" /> Mi perfil
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  onClick={() => { navigate('/admin'); onClose() }}
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/5 text-[#F59E0B]"
                >
                  <Shield className="w-4 h-4 mr-2" /> Panel admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
              >
                <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/login" onClick={onClose}>
            <Button className="w-full bg-[#00D084] hover:bg-[#00b872] text-[#070C18] font-semibold text-sm h-9">
              Iniciar sesión
            </Button>
          </Link>
        )}
      </div>
    </aside>
  )
}
