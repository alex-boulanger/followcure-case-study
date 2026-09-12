import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFollowCureApi } from './follow-ups'
import type { FollowUpRow } from './types'

const fixedNow = () => new Date(2026, 8, 12, 12)
const createApi = () => createFollowCureApi(0, fixedNow)
const approved = {
  id: 'fu-1',
  action: 'both' as const,
  message: 'Bonjour Sophie, souhaitez-vous poursuivre votre cure ?',
}
const pick = (rows: Array<FollowUpRow>, id: string) =>
  rows.find((row) => row.followUp.id === id)!
const rowOf = async (api: ReturnType<typeof createApi>, id: string) =>
  pick((await api.getWorkspace()).rows, id)

test('only patients whose course is ending are proposed, and every exclusion is explained', async () => {
  const api = createApi()
  const { rows } = await api.getWorkspace()
  const eligible = rows
    .filter((row) => row.eligible)
    .map((row) => row.followUp.id)

  assert.deepEqual(eligible.sort(), ['fu-1', 'fu-2', 'fu-3'])
  assert.match(pick(rows, 'fu-4').reason, /Reporté/) // snoozed
  assert.match(pick(rows, 'fu-5').reason, /commande de cette cure/) // already renewed
  assert.match(pick(rows, 'fu-6').reason, /Cure arrêtée/)
  assert.match(pick(rows, 'fu-7').reason, /désactivé les messages/)
  assert.match(pick(rows, 'fu-8').reason, /Durée de cure inconnue/)
  assert.match(pick(rows, 'fu-9').reason, /À revoir le/) // not due yet
})

test('the estimated end date says what it is based on, and is never invented', async () => {
  const { rows } = await createApi().getWorkspace()

  assert.equal(pick(rows, 'fu-1').basis, 'declared')
  assert.equal(pick(rows, 'fu-1').endDate, '2026-09-15')
  assert.equal(pick(rows, 'fu-2').basis, 'order')
  assert.equal(pick(rows, 'fu-8').endDate, null)
  assert.equal(pick(rows, 'fu-1').eligible, true) // an unrelated purchase is not a refill
})

test('a message is only sent once, after approval, and never to an excluded patient', async () => {
  const api = createApi()
  await assert.rejects(
    api.sendFollowUp({ ...approved, message: '  ' }),
    /Rédigez/,
  )
  await assert.rejects(
    api.sendFollowUp({ ...approved, id: 'fu-5' }),
    /commande de cette cure/,
  )
  await assert.rejects(
    api.sendFollowUp({ ...approved, id: 'fu-7' }),
    /désactivé les messages/,
  )

  await Promise.all([api.sendFollowUp(approved), api.sendFollowUp(approved)])
  const row = await rowOf(api, 'fu-1')
  assert.equal(row.followUp.status, 'sent')
  assert.equal(row.followUp.message, approved.message)
  assert.equal(row.eligible, false)
})

test('a repeat order closes the course cycle instead of proposing a second follow-up', async () => {
  const api = createApi()
  await assert.rejects(api.recordPatientOrder('fu-1'), /Validez et envoyez/)

  await api.sendFollowUp(approved)
  await Promise.all([
    api.recordPatientOrder('fu-1'),
    api.recordPatientOrder('fu-1'),
  ])
  const row = await rowOf(api, 'fu-1')

  assert.ok(row.followUp.repeatOrderId)
  assert.equal(row.eligible, false)
  assert.match(row.reason, /commande de cette cure/)
})

test('the patient can only act on what the practitioner proposed', async () => {
  const api = createApi()
  await api.sendFollowUp({ ...approved, action: 'refill' })
  await assert.rejects(
    api.recordPatientAppointment('fu-1'),
    /pas de rendez-vous/,
  )

  await api.sendFollowUp({ ...approved, id: 'fu-2', action: 'appointment' })
  await assert.rejects(api.recordPatientOrder('fu-2'), /pas de renouvellement/)
  await api.recordPatientAppointment('fu-2')
  assert.equal((await rowOf(api, 'fu-2')).followUp.appointmentAt, '2026-09-15')
})

test('a snoozed follow-up comes back on its own, a dismissed one does not', async () => {
  const api = createApi()
  await assert.rejects(
    api.snoozeFollowUp({ id: 'fu-1', until: '2026-09-12' }),
    /postérieure/,
  )
  await api.snoozeFollowUp({ id: 'fu-1', until: '2026-09-14' })
  await api.dismissFollowUp({ id: 'fu-2', reason: 'Cure terminée' })

  assert.equal((await rowOf(api, 'fu-1')).eligible, false)
  assert.equal((await rowOf(api, 'fu-4')).eligible, false)

  await api.advanceDemoClock()
  assert.equal((await rowOf(api, 'fu-1')).eligible, true)
  assert.equal((await rowOf(api, 'fu-4')).eligible, true)
  const dismissed = await rowOf(api, 'fu-2')
  assert.equal(dismissed.eligible, false)
  assert.equal(dismissed.reason, 'Cure terminée')
})

test('the demo data is rebuilt around the day it is opened', async () => {
  for (const now of [
    new Date(2030, 11, 30, 23, 55),
    new Date(2032, 1, 27, 0, 5),
  ]) {
    const api = createFollowCureApi(0, () => now)
    const { today, rows } = await api.getWorkspace()

    assert.equal(
      today,
      [now.getFullYear(), now.getMonth() + 1, now.getDate()]
        .map((part) => String(part).padStart(2, '0'))
        .join('-'),
    )
    assert.deepEqual(
      rows
        .filter((row) => row.eligible)
        .map((row) => row.followUp.id)
        .sort(),
      ['fu-1', 'fu-2', 'fu-3'],
    )
  }
})

test('the UI cannot mutate the store by holding a row', async () => {
  const api = createApi()
  const snapshot = await api.getWorkspace()
  snapshot.rows[0].patient.name = 'Modification inattendue'
  assert.notEqual(
    (await api.getWorkspace()).rows[0].patient.name,
    'Modification inattendue',
  )
})
