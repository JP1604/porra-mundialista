import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Menu, Trophy } from 'lucide-react'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--app-bg)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        {/* Mobile top bar */}
        <header
          className="md:hidden sticky top-0 z-10 flex items-center gap-3 px-4 h-14 backdrop-blur-md"
          style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--border-color)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#F59E0B]" />
            <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight">
              Porra <span className="text-[#00D084]">2026</span>
            </span>
          </Link>
        </header>

        <main className="flex-1 w-full max-w-screen-xl mx-auto px-4 py-6 md:px-8 xl:px-12">
          <Outlet />
        </main>

        <footer className="py-5 text-center text-xs text-slate-500" style={{ borderTop: '1px solid var(--border-color)' }}>
          Porra Mundialista 2026 &middot; USA &ndash; Canadá &ndash; México
        </footer>
      </div>
    </div>
  )
}
