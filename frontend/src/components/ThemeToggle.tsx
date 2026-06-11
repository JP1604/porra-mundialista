import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
        'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
        'dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.07]',
        className
      )}
    >
      {theme === 'dark'
        ? <Sun className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  )
}
