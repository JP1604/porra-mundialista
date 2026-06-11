import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, X, Trophy, LogOut, User, Shield } from 'lucide-react'

const NAV_LINKS = [
  { to: '/',           label: 'Inicio' },
  { to: '/fixture',    label: 'Fixture' },
  { to: '/porra',      label: 'Mi Porra' },
  { to: '/leaderboard',label: 'Clasificación' },
]

export function Navbar() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0A0E1A]/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Trophy className="w-5 h-5 text-[#FFD700]" />
          <span className="font-black text-white text-base tracking-tight">
            Porra <span className="text-[#00D084]">2026</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[#00D084] bg-[#00D084]/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                  isActive
                    ? 'text-[#FFD700] bg-[#FFD700]/10'
                    : 'text-slate-500 hover:text-[#FFD700] hover:bg-[#FFD700]/5'
                )
              }
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </NavLink>
          )}
        </nav>

        {/* User actions */}
        <div className="flex items-center gap-2">
          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full w-8 h-8 p-0 hover:bg-white/10">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-[#00D084]/20 text-[#00D084] text-xs font-bold">
                      {getInitials(profile.alias)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#111827] border-white/10 text-slate-200 min-w-[180px]">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-white">{profile.alias}</p>
                  <p className="text-xs text-slate-500">{profile.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => navigate(`/profile/${profile.id}`)}
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                >
                  <User className="w-4 h-4 mr-2" /> Mi perfil
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate('/admin')}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5 text-[#FFD700]"
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
            <Link to="/login">
              <Button size="sm" className="bg-[#00D084] hover:bg-[#00b872] text-[#0A0E1A] font-semibold text-xs h-8">
                Iniciar sesión
              </Button>
            </Link>
          )}

          {/* Hamburger mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden w-8 h-8 p-0 text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-white/8 bg-[#0A0E1A]/95 px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[#00D084] bg-[#00D084]/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5',
                  isActive ? 'text-[#FFD700] bg-[#FFD700]/10' : 'text-slate-500 hover:text-[#FFD700]'
                )
              }
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </NavLink>
          )}
        </nav>
      )}
    </header>
  )
}
