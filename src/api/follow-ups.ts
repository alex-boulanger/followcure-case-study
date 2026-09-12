import { addDays } from '#/lib/dates'
import { createDemoData } from './fixtures'
import { assessFollowUp } from './eligibility'
import type { Action, FollowUp, FollowUpRow, Workspace } from './types'

/**
 * The whole demo runs in memory, behind async functions: one isolated workspace
 * per browser tab, and a single place where the rules are enforced.
 */
export function createFollowCureApi(latency = 200, now = () => new Date()) {
  let data = createDemoData(now())
  const wait = () => new Promise((resolve) => setTimeout(resolve, latency))

  function find(id: string) {
    const followUp = data.followUps.find((value) => value.id === id)
    if (!followUp)
      throw new Error('Ce suivi n’existe plus. Actualisez la liste.')
    return followUp
  }

  function toRow(followUp: FollowUp): FollowUpRow {
    const patient = data.patients.find((v) => v.id === followUp.patientId)!
    const protocol = data.protocols.find((v) => v.id === followUp.protocolId)!
    const order = data.orders.find((v) => v.id === followUp.sourceOrderId)!
    return {
      followUp,
      patient,
      protocol,
      order,
      ...assessFollowUp({
        followUp,
        patient,
        protocol,
        order,
        orders: data.orders,
        today: data.today,
      }),
    }
  }

  /** Rechecked at the last moment: a queue loaded ten minutes ago cannot send. */
  function requireEligible(id: string) {
    const row = toRow(find(id))
    if (!row.eligible)
      throw new Error(
        `Suivi indisponible : ${row.reason.toLocaleLowerCase('fr')}.`,
      )
    return row.followUp
  }

  function requireSent(id: string) {
    const followUp = find(id)
    if (followUp.status !== 'sent')
      throw new Error(
        'Validez et envoyez le message avant de simuler une réponse du patient.',
      )
    return followUp
  }

  return {
    async getWorkspace(): Promise<Workspace> {
      await wait()
      const rows = data.followUps
        .map(toRow)
        .sort((a, b) =>
          (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
        )
      // Detached copy: holding a row never lets the UI mutate the store.
      return structuredClone({
        today: data.today,
        practitioner: data.practitioner,
        rows,
      })
    },

    /** Nothing reaches a patient without the practitioner approving this message. */
    async sendFollowUp(input: { id: string; action: Action; message: string }) {
      await wait()
      const message = input.message.trim()
      if (!message) throw new Error('Rédigez un message avant l’envoi.')
      if (find(input.id).status === 'sent') return // Sending twice sends once.
      const followUp = requireEligible(input.id)
      Object.assign(followUp, {
        status: 'sent',
        action: input.action,
        message,
        sentAt: data.today,
      })
    },

    async snoozeFollowUp(input: { id: string; until: string }) {
      await wait()
      if (input.until <= data.today)
        throw new Error('Choisissez une date postérieure à aujourd’hui.')
      Object.assign(requireEligible(input.id), {
        status: 'snoozed',
        snoozedUntil: input.until,
      })
    },

    async dismissFollowUp(input: { id: string; reason: string }) {
      await wait()
      const reason = input.reason.trim()
      if (!reason) throw new Error('Indiquez un motif.')
      Object.assign(requireEligible(input.id), {
        status: 'dismissed',
        dismissalReason: reason,
      })
    },

    /** Simulated patient response: a repeat order closes this course cycle. */
    async recordPatientOrder(id: string) {
      await wait()
      const followUp = requireSent(id)
      if (followUp.repeatOrderId) return
      if (followUp.action === 'appointment')
        throw new Error('Ce message ne propose pas de renouvellement.')
      const order = data.orders.find((v) => v.id === followUp.sourceOrderId)!
      const repeatOrderId = `repeat-${++data.sequence}`
      data.orders.push({
        ...order,
        id: repeatOrderId,
        orderedAt: data.today,
        deliveredAt: null,
        startedAt: null,
      })
      followUp.repeatOrderId = repeatOrderId
    },

    async recordPatientAppointment(id: string) {
      await wait()
      const followUp = requireSent(id)
      if (followUp.appointmentAt) return
      if (followUp.action === 'refill')
        throw new Error('Ce message ne propose pas de rendez-vous.')
      followUp.appointmentAt = addDays(data.today, 3)
    },

    /** Demo control. Eligibility is derived, so snoozes simply expire. */
    async advanceDemoClock() {
      await wait()
      data.today = addDays(data.today, 7)
    },

    async resetDemo() {
      await wait()
      data = createDemoData(now())
    },
  }
}

export const api = createFollowCureApi()
