import { ArrowLeft } from 'lucide-react'
import { formatDate } from '#/lib/dates'
import { useFollowCureMutation } from './hooks'
import { money } from './presentation'
import type { Action, FollowUpRow, Practitioner } from '#/api/types'

/** What the patient would receive. Sending, payment and booking are simulated. */
export function PatientPreview({
  row,
  practitioner,
  message,
  action,
  onBack,
}: {
  row: FollowUpRow
  practitioner: Practitioner
  message: string
  action: Action
  onBack: () => void
}) {
  const mutation = useFollowCureMutation()
  const sent = row.followUp.status === 'sent'
  const subtotal = row.protocol.products.reduce(
    (total, product) => total + product.price * product.quantity,
    0,
  )

  return (
    <div className="patient-preview">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={15} /> Retour au message
      </button>
      <h3 className="patient-title">Votre cure, à votre rythme.</h3>
      <p className="sender">Un message de {practitioner.name}</p>
      <div className="message-bubble">{message}</div>

      {action !== 'appointment' && (
        <section className="patient-section">
          <h4>Renouveler ma cure</h4>
          {row.protocol.products.map((product) => (
            <div className="price-row" key={product.name}>
              <span>
                {product.quantity} × {product.name}
              </span>
              <span>{money(product.quantity * product.price)}</span>
            </div>
          ))}
          <div className="price-row">
            <span>Votre remise habituelle de {practitioner.discount} %</span>
            <span>−{money((subtotal * practitioner.discount) / 100)}</span>
          </div>
          <div className="price-row total">
            <strong>Total</strong>
            <strong>
              {money(subtotal * (1 - practitioner.discount / 100))}
            </strong>
          </div>
          {row.followUp.repeatOrderId ? (
            <p className="success" role="status">
              Commande confirmée
            </p>
          ) : (
            <button
              className="button primary"
              disabled={!sent || mutation.isPending}
              onClick={() =>
                mutation.mutate({ type: 'patient-order', id: row.followUp.id })
              }
            >
              Commander
            </button>
          )}
        </section>
      )}

      {action !== 'refill' && (
        <section className="patient-section">
          <h4>Faire le point avec {practitioner.name.split(' ')[0]}</h4>
          <p>Un rendez-vous pour décider ensemble de la suite.</p>
          {row.followUp.appointmentAt ? (
            <p className="success" role="status">
              Rendez-vous prévu le {formatDate(row.followUp.appointmentAt)}
            </p>
          ) : (
            <button
              className="button secondary"
              disabled={!sent || mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  type: 'patient-appointment',
                  id: row.followUp.id,
                })
              }
            >
              Prendre rendez-vous
            </button>
          )}
        </section>
      )}

      {!sent && (
        <p className="caption">
          Validez le message pour activer les actions du patient.
        </p>
      )}
      {mutation.error && (
        <p className="error" role="alert">
          {mutation.error.message}
        </p>
      )}
    </div>
  )
}
