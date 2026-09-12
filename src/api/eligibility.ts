import { addDays, formatDate } from '#/lib/dates'
import type { FollowUp, Order, Patient, Protocol } from './types'

/** The practitioner is asked to decide a week before the estimated course end. */
export const FOLLOW_UP_OFFSET_DAYS = 7

/**
 * The end of a course is an estimate, never a fact: we use the date the patient
 * declared, then the delivery date, then the order date as a labelled fallback.
 */
export function estimateCourse(order: Order, protocol: Protocol) {
  const basis = order.startedAt
    ? ('declared' as const)
    : order.deliveredAt
      ? ('delivery' as const)
      : ('order' as const)
  const start = order.startedAt ?? order.deliveredAt ?? order.orderedAt
  const endDate = protocol.durationDays
    ? addDays(start, protocol.durationDays)
    : null
  const dueDate = endDate ? addDays(endDate, -FOLLOW_UP_OFFSET_DAYS) : null
  return { basis, endDate, dueDate }
}

/**
 * A follow-up is only proposed when every exclusion is clear. The first rule
 * that applies is the explanation shown to the practitioner, so no patient ever
 * appears — or disappears — without a reason.
 */
export function assessFollowUp(input: {
  followUp: FollowUp
  patient: Patient
  protocol: Protocol
  order: Order
  orders: Array<Order>
  today: string
}) {
  const { followUp, patient, protocol, order, orders, today } = input
  const { basis, endDate, dueDate } = estimateCourse(order, protocol)

  const alreadyRenewed = orders.some(
    (other) =>
      other.id !== order.id &&
      other.patientId === order.patientId &&
      other.protocolId === order.protocolId &&
      other.orderedAt > order.orderedAt,
  )

  const exclusions: Array<[boolean, string]> = [
    [!patient.contactAllowed, 'Le patient a désactivé les messages de suivi'],
    [followUp.courseStopped, 'Cure arrêtée : aucun renouvellement prévu'],
    [alreadyRenewed, 'Une commande de cette cure a déjà été passée'],
    [
      followUp.status === 'sent',
      `Message envoyé le ${formatDate(followUp.sentAt)}`,
    ],
    [
      followUp.status === 'dismissed',
      followUp.dismissalReason ?? 'Suivi écarté par le praticien',
    ],
    [
      followUp.status === 'snoozed' &&
        !!followUp.snoozedUntil &&
        followUp.snoozedUntil > today,
      `Reporté au ${formatDate(followUp.snoozedUntil)}`,
    ],
    [!endDate, 'Durée de cure inconnue : dossier à vérifier'],
    [!!dueDate && dueDate > today, `À revoir le ${formatDate(dueDate)}`],
  ]

  const excluded = exclusions.find(([applies]) => applies)
  return {
    basis,
    endDate,
    dueDate,
    eligible: !excluded,
    reason: excluded?.[1] ?? 'Fin de cure estimée à l’approche',
  }
}
