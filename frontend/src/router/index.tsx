import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { Home } from '@/pages/Home'
import { Fixture } from '@/pages/Fixture'
import { Porra } from '@/pages/Porra'
import { Leaderboard } from '@/pages/Leaderboard'
import { MatchDetail } from '@/pages/MatchDetail'
import { Profile } from '@/pages/Profile'
import { Admin } from '@/pages/Admin'
import { Login } from '@/pages/Login'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth()
  if (isLoading) return null
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, isLoading } = useAuth()
  if (isLoading) return null
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'fixture',     element: <Fixture /> },
      { path: 'leaderboard', element: <Leaderboard /> },
      { path: 'match/:id',   element: <MatchDetail /> },
      {
        path: 'porra',
        element: <ProtectedRoute><Porra /></ProtectedRoute>,
      },
      {
        path: 'profile/:userId',
        element: <ProtectedRoute><Profile /></ProtectedRoute>,
      },
      {
        path: 'admin',
        element: <AdminRoute><Admin /></AdminRoute>,
      },
    ],
  },
])
