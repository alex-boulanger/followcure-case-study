import { daysBetween, formatDate } from '#/lib/dates'
import type { Action, DateBasis, FollowUpRow, Practitioner } from '#/api/types'

export const money = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    amount,
  )

export const basisLabel: Record<DateBasis, string> = {
  declared: 'Début déclaré par le patient',
  delivery: 'Date de livraison',
  order: 'Date de commande (par défaut)',
}

export function remainingLabel(endDate: string | null, today: string) {
  if (!endDate) return 'À préciser'
  const days = daysBetween(today, endDate)
  if (days < 0) return `Il y a ${Math.abs(days)} j`
  return days === 0 ? 'Aujourd’hui' : `Dans ${days} j`
}

export function situationLabel(row: FollowUpRow) {
  if (row.followUp.repeatOrderId) return 'Commande confirmée'
  if (row.followUp.appointmentAt)
    return `Rendez-vous le ${formatDate(row.followUp.appointmentAt)}`
  return row.reason
}

/** A deterministic template the practitioner can edit before approving it. */
export function generateMessage(
  row: FollowUpRow,
  practitioner: Practitioner,
  action: Action,
) {
  const firstName = row.patient.name.split(' ')[0]
  const next =
    action === 'appointment'
      ? 'Je vous propose de faire le point avant de décider de la suite. Vous pouvez prendre rendez-vous ci-dessous.'
      : action === 'both'
        ? 'Si vous souhaitez poursuivre le protocole dont nous avons discuté, vous le retrouverez ci-dessous. Vous pouvez aussi prendre rendez-vous pour faire le point.'
        : 'Si vous souhaitez poursuivre le protocole dont nous avons discuté, vous le retrouverez ci-dessous.'
  return [
    `Bonjour ${firstName}, c’est ${practitioner.name}. Votre cure « ${row.protocol.name} » approche peut-être de sa fin. Comment vous sentez-vous ?`,
    next,
    'Vous restez libre de renouveler ou non votre cure.',
  ].join('\n\n')
}
