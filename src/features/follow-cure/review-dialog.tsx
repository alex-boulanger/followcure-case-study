import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Modal } from '#/components/modal'
import { addDays, formatDate } from '#/lib/dates'
import { useFollowCureMutation } from './hooks'
import { basisLabel, generateMessage } from './presentation'
import { PatientPreview } from './patient-preview'
import type { Action, FollowUpRow, Practitioner } from '#/api/types'

const choices: Array<{ value: Action; label: string }> = [
  { value: 'refill', label: 'Renouvellement' },
  { value: 'appointment', label: 'Rendez-vous' },
  { value: 'both', label: 'Les deux' },
]

const reasons = [
  'Cure terminée, pas de renouvellement nécessaire',
  'Le patient me recontactera',
  'Suivi réalisé hors Simplycure',
  'Dates de cure incorrectes',
]

export function ReviewDialog({
  row,
  practitioner,
  today,
  preview,
  onPreviewChange,
  onClose,
}: {
  row: FollowUpRow
  practitioner: Practitioner
  today: string
  preview: boolean
  onPreviewChange: (value: boolean) => void
  onClose: () => void
}) {
  const sent = row.followUp.status === 'sent'
  const [action, setAction] = useState<Action>(row.followUp.action ?? 'both')
  const [message, setMessage] = useState(
    row.followUp.message ?? generateMessage(row, practitioner, 'both'),
  )
  const [edited, setEdited] = useState(false)
  const [alternate, setAlternate] = useState<'snooze' | 'dismiss' | null>(null)
  const [until, setUntil] = useState(addDays(today, 7))
  const [reason, setReason] = useState(reasons[0])
  const mutation = useFollowCureMutation()
  const disabled = mutation.isPending || sent || !row.eligible

  function selectAction(value: Action) {
    setAction(value)
    // The template follows the choice until the practitioner writes their own.
    if (!edited) setMessage(generateMessage(row, practitioner, value))
  }

  return (
    <Modal
      title={preview ? 'Aperçu patient' : row.patient.name}
      onClose={onClose}
      busy={mutation.isPending}
    >
      {preview ? (
        <PatientPreview
          row={row}
          practitioner={practitioner}
          message={sent ? (row.followUp.message ?? message) : message}
          action={sent ? (row.followUp.action ?? action) : action}
          onBack={() => onPreviewChange(false)}
        />
      ) : (
        <>
          <div className="review-content">
            <section className="course-summary">
              <h3>{row.protocol.name}</h3>
              <p>
                {row.protocol.products
                  .map((product) => product.name)
                  .join(' · ')}
              </p>
              <dl>
                <div>
                  <dt>Commande</dt>
                  <dd>{formatDate(row.order.orderedAt)}</dd>
                </div>
                <div>
                  <dt>Fin estimée</dt>
                  <dd>{formatDate(row.endDate)}</dd>
                </div>
                <div>
                  <dt>Estimation basée sur</dt>
                  <dd>{basisLabel[row.basis]}</dd>
                </div>
              </dl>
            </section>

            {sent ? (
              <p className="success" role="status">
                Message envoyé (simulation).
              </p>
            ) : (
              <>
                <h3>Quelle suite proposer ?</h3>
                <div
                  className="action-options"
                  role="group"
                  aria-label="Action de suivi"
                >
                  {choices.map(({ value, label }) => (
                    <button
                      key={value}
                      className={
                        action === value
                          ? 'action-option selected'
                          : 'action-option'
                      }
                      aria-pressed={action === value}
                      disabled={disabled}
                      onClick={() => selectAction(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="message-label">
              <label htmlFor="message">
                {sent ? 'Message validé' : 'Votre message'}
              </label>
              {!sent && edited && (
                <button
                  className="text-button"
                  disabled={disabled}
                  onClick={() => {
                    setMessage(generateMessage(row, practitioner, action))
                    setEdited(false)
                  }}
                >
                  Rétablir le modèle
                </button>
              )}
            </div>
            <textarea
              id="message"
              rows={8}
              maxLength={1200}
              value={message}
              disabled={disabled}
              onChange={(event) => {
                setMessage(event.target.value)
                setEdited(true)
              }}
            />
            <button
              className="text-button preview-link"
              onClick={() => onPreviewChange(true)}
            >
              <Eye size={16} /> Voir l’aperçu patient
            </button>

            {!row.eligible && !sent && (
              <p className="error" role="alert">
                Suivi indisponible : {row.reason.toLocaleLowerCase('fr')}.
              </p>
            )}
            {mutation.error && (
              <p className="error" role="alert">
                {mutation.error.message}
              </p>
            )}

            {alternate && (
              <div className="alternate-form">
                {alternate === 'snooze' ? (
                  <label>
                    Reporter au
                    <input
                      type="date"
                      value={until}
                      min={addDays(today, 1)}
                      onChange={(event) => setUntil(event.target.value)}
                    />
                  </label>
                ) : (
                  <label>
                    Motif
                    <select
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    >
                      {reasons.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="form-actions">
                  <button
                    className="button secondary"
                    disabled={
                      disabled || (alternate === 'snooze' && until <= today)
                    }
                    onClick={() =>
                      mutation.mutate(
                        alternate === 'snooze'
                          ? { type: 'snooze', id: row.followUp.id, until }
                          : { type: 'dismiss', id: row.followUp.id, reason },
                        { onSuccess: onClose },
                      )
                    }
                  >
                    Confirmer
                  </button>
                  <button
                    className="text-button"
                    disabled={mutation.isPending}
                    onClick={() => setAlternate(null)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          <footer className="modal-footer">
            {sent ? (
              <button
                className="button primary"
                onClick={() => onPreviewChange(true)}
              >
                Voir côté patient
              </button>
            ) : (
              <>
                <div className="footer-secondary">
                  <button
                    className="text-button"
                    disabled={disabled}
                    onClick={() => setAlternate('snooze')}
                  >
                    Reporter
                  </button>
                  <button
                    className="text-button"
                    disabled={disabled}
                    onClick={() => setAlternate('dismiss')}
                  >
                    Écarter
                  </button>
                </div>
                <div className="send-action">
                  <button
                    className="button primary"
                    disabled={disabled || !message.trim() || alternate !== null}
                    onClick={() =>
                      mutation.mutate({
                        type: 'send',
                        id: row.followUp.id,
                        action,
                        message,
                      })
                    }
                  >
                    {mutation.isPending ? 'Envoi…' : 'Valider et envoyer'}
                  </button>
                  <small>Envoi simulé</small>
                </div>
              </>
            )}
          </footer>
        </>
      )}
    </Modal>
  )
}
