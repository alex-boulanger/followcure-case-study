import { Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { HeartHandshake, Leaf, Users } from 'lucide-react'
import { formatDate } from '#/lib/dates'
import {
  useFollowCureMutation,
  useWorkspace,
} from '#/features/follow-cure/hooks'

export function AppShell() {
  const { data } = useWorkspace()
  const name = data?.practitioner.name ?? ''
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/suivis" className="brand" aria-label="Simplycure — accueil">
          <span className="brand-mark">
            <Leaf size={24} />
          </span>
          <span className="brand-name">simplycure.</span>
        </Link>
        <nav aria-label="Navigation principale">
          <Link to="/patients" activeProps={{ className: 'active' }}>
            <Users size={19} />
            <span className="nav-label">Patients</span>
          </Link>
          <Link to="/suivis" activeProps={{ className: 'active' }}>
            <HeartHandshake size={19} />
            <span className="nav-label">FollowCure</span>
          </Link>
        </nav>
      </aside>
      <div className="admin-main">
        <header className="app-header">
          <PageName />
          <div className="practitioner">
            <span className="practitioner-name">{name}</span>
            <span className="practitioner-avatar" aria-hidden="true">
              {name
                .split(' ')
                .map((part) => part[0])
                .join('')}
            </span>
          </div>
        </header>
        <div className="page-content">
          <main>
            <Outlet />
          </main>
          <DemoControls />
        </div>
      </div>
    </div>
  )
}

function PageName() {
  const matchRoute = useMatchRoute()
  return (
    <span>{matchRoute({ to: '/patients' }) ? 'Patients' : 'FollowCure'}</span>
  )
}

/** The demo clock makes the time-based rules visible during a walkthrough. */
function DemoControls() {
  const { data } = useWorkspace()
  const mutation = useFollowCureMutation()
  if (!data) return null
  return (
    <details className="demo-controls">
      <summary>Démo</summary>
      <div>
        <span>
          {formatDate(data.today)} {data.today.slice(0, 4)}
        </span>
        <button
          className="text-button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ type: 'advance' })}
        >
          Avancer de 7 jours
        </button>
        <button
          className="text-button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ type: 'reset' })}
        >
          Réinitialiser
        </button>
      </div>
    </details>
  )
}
