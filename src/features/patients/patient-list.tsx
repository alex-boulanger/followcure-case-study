import { useState } from 'react'
import { ArrowUpRight, Search } from 'lucide-react'
import { formatDate } from '#/lib/dates'
import { useWorkspace } from '#/features/follow-cure/hooks'
import { situationLabel } from '#/features/follow-cure/presentation'
import { ReviewDialog } from '#/features/follow-cure/review-dialog'

/** Every patient, including those the queue deliberately leaves alone. */
export function PatientList() {
  const { data, error, refetch } = useWorkspace()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<{ id: string; preview: boolean } | null>(
    null,
  )
  const openRow = data?.rows.find((row) => row.followUp.id === open?.id)
  const rows = data?.rows.filter((row) =>
    `${row.patient.name} ${row.protocol.name}`
      .toLocaleLowerCase('fr')
      .includes(search.toLocaleLowerCase('fr')),
  )

  return (
    <>
      <header className="page-heading">
        <h1>Vos patients, tout simplement.</h1>
        <p>Une vue sur leurs cures et la suite à donner.</p>
      </header>

      {!data || !rows ? (
        <div className="empty" role={error ? 'alert' : 'status'}>
          <p>{error ? 'Impossible de charger les patients.' : 'Chargement…'}</p>
          {error && (
            <button className="text-button" onClick={() => void refetch()}>
              Réessayer
            </button>
          )}
        </div>
      ) : (
        <section className="queue-panel" aria-label="Liste des patients">
          <div className="queue-toolbar">
            <h2>
              Patients <span className="count">{data.rows.length}</span>
            </h2>
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Rechercher un patient"
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
                    <td>{formatDate(row.endDate)}</td>
                    <td className="patient-reason">{situationLabel(row)}</td>
                    <td>
                      {(row.eligible || row.followUp.status === 'sent') && (
                        <button
                          className="review-button"
                          aria-label={`Ouvrir le suivi de ${row.patient.name}`}
                          onClick={() =>
                            setOpen({
                              id: row.followUp.id,
                              preview: row.followUp.status === 'sent',
                            })
                          }
                        >
                          Voir
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
              <h2>Aucun patient trouvé</h2>
              <button className="text-button" onClick={() => setSearch('')}>
                Effacer la recherche
              </button>
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
