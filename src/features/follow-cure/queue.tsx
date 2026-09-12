import { useState } from 'react'
import { ArrowUpRight, Search } from 'lucide-react'
import { formatDate } from '#/lib/dates'
import { useWorkspace } from './hooks'
import { remainingLabel, situationLabel } from './presentation'
import { ReviewDialog } from './review-dialog'
import type { FollowUpRow } from '#/api/types'

const tabs = [
  { id: 'todo', label: 'À traiter', match: (row: FollowUpRow) => row.eligible },
  {
    id: 'sent',
    label: 'Envoyés',
    match: (row: FollowUpRow) => row.followUp.status === 'sent',
  },
  {
    id: 'none',
    label: 'Sans relance',
    match: (row: FollowUpRow) =>
      !row.eligible && row.followUp.status !== 'sent',
  },
] as const

export function FollowUpQueue() {
  const { data, error, refetch } = useWorkspace()
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('todo')
  const [open, setOpen] = useState<{ id: string; preview: boolean } | null>(
    null,
  )
  const [search, setSearch] = useState('')
  const openRow = data?.rows.find((row) => row.followUp.id === open?.id)
  const matchesTab = tabs.find((value) => value.id === tab)!.match
  const rows = data?.rows.filter(
    (row) =>
      matchesTab(row) &&
      `${row.patient.name} ${row.protocol.name}`
        .toLocaleLowerCase('fr')
        .includes(search.toLocaleLowerCase('fr')),
  )

  return (
    <>
      <header className="page-heading">
        <h1>Le soin continue.</h1>
        <p>
          Les patients dont la cure se termine, et rien d’autre. Vous décidez de
          la suite.
        </p>
      </header>

      {!data || !rows ? (
        <div className="empty" role={error ? 'alert' : 'status'}>
          <p>{error ? 'Impossible de charger les suivis.' : 'Chargement…'}</p>
          {error && (
            <button className="text-button" onClick={() => void refetch()}>
              Réessayer
            </button>
          )}
        </div>
      ) : (
        <section className="queue-panel" aria-label="Suivis patients">
          <div className="queue-toolbar">
            <div className="tabs" role="group" aria-label="Filtrer les suivis">
              {tabs.map((value) => (
                <button
                  key={value.id}
                  className={value.id === tab ? 'tab active' : 'tab'}
                  aria-pressed={value.id === tab}
                  onClick={() => setTab(value.id)}
                >
                  {value.label}
                  <span>{data.rows.filter(value.match).length}</span>
                </button>
              ))}
            </div>
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Rechercher un suivi"
                placeholder="Rechercher un patient…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Patient / protocole</th>
                  <th>Fin de cure estimée</th>
                  <th>Situation</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.followUp.id}>
                    <td>
                      <strong>{row.patient.name}</strong>
                      <span className="secondary-text">
                        {row.protocol.name}
                      </span>
                    </td>
                    <td>
                      {formatDate(row.endDate)}
                      <span className="secondary-text">
                        {remainingLabel(row.endDate, data.today)}
                      </span>
                    </td>
                    <td>
                      <span className="pill">{situationLabel(row)}</span>
                    </td>
                    <td>
                      {(row.eligible || row.followUp.status === 'sent') && (
                        <button
                          className="review-button"
                          onClick={() =>
                            setOpen({
                              id: row.followUp.id,
                              preview: row.followUp.status === 'sent',
                            })
                          }
                        >
                          {row.eligible ? 'Suivre' : 'Voir'}
                          <ArrowUpRight size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <div className="empty">
              <h2>
                {search
                  ? 'Aucun patient trouvé'
                  : tab === 'todo'
                    ? 'Tous vos suivis sont à jour.'
                    : 'Aucun suivi dans cette liste.'}
              </h2>
              {search && (
                <button className="text-button" onClick={() => setSearch('')}>
                  Effacer la recherche
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {data && openRow && open && (
        <ReviewDialog
          key={openRow.followUp.id}
          row={openRow}
          practitioner={data.practitioner}
          today={data.today}
          preview={open.preview}
          onPreviewChange={(preview) => setOpen({ ...open, preview })}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}
