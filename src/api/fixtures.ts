import { addDays, toDateString } from '#/lib/dates'
import type { FollowUp, Order, Patient, Practitioner, Protocol } from './types'

const practitioner: Practitioner = {
  id: 'pr-1',
  name: 'Alice Martin',
  commission: 10,
  discount: 10,
}

const protocols: Array<Protocol> = [
  {
    id: 'proto-1',
    name: 'Équilibre au quotidien',
    products: [
      { name: 'Complexe de magnésium · 60 gélules', quantity: 1, price: 28 },
      { name: 'Complexe de vitamines B · 30 gélules', quantity: 1, price: 22 },
    ],
    durationDays: 60,
  },
  {
    id: 'proto-2',
    name: 'Confort digestif',
    products: [
      { name: 'Complexe probiotique · 30 gélules', quantity: 1, price: 36 },
    ],
    durationDays: 30,
  },
  {
    id: 'proto-3',
    name: 'Soutien saisonnier',
    products: [{ name: 'Vitamine D · 30 ml', quantity: 1, price: 19 }],
    durationDays: 90,
  },
  {
    id: 'proto-4',
    name: 'Cure personnalisée',
    products: [
      { name: 'Complexe de magnésium · 60 gélules', quantity: 1, price: 28 },
    ],
    durationDays: null,
  },
]

/** Each case illustrates exactly one rule of the queue. */
const cases = [
  // Proposed today.
  {
    name: 'Sophie Laurent',
    protocol: 'proto-1',
    endsInDays: 3,
    basis: 'declared',
    unrelatedOrder: true,
  },
  { name: 'Thomas Petit', protocol: 'proto-2', endsInDays: 5, basis: 'order' },
  {
    name: 'Emma Dubois',
    protocol: 'proto-3',
    endsInDays: 0,
    basis: 'delivery',
  },
  // Excluded, each for a different reason.
  {
    name: 'Chloé Moreau',
    protocol: 'proto-2',
    endsInDays: 4,
    basis: 'delivery',
    snoozedInDays: 3,
  },
  {
    name: 'Hugo Robert',
    protocol: 'proto-1',
    endsInDays: 2,
    basis: 'delivery',
    renewed: true,
  },
  {
    name: 'Léa Richard',
    protocol: 'proto-2',
    endsInDays: 1,
    basis: 'delivery',
    courseStopped: true,
  },
  {
    name: 'Gabriel Durand',
    protocol: 'proto-1',
    endsInDays: 6,
    basis: 'delivery',
    contactRefused: true,
  },
  {
    name: 'Camille Simon',
    protocol: 'proto-4',
    endsInDays: 0,
    basis: 'delivery',
  },
  {
    name: 'Lucas Bernard',
    protocol: 'proto-2',
    endsInDays: 25,
    basis: 'delivery',
  },
] satisfies Array<{
  name: string
  protocol: string
  endsInDays: number
  basis: 'declared' | 'delivery' | 'order'
  unrelatedOrder?: boolean
  snoozedInDays?: number
  renewed?: boolean
  courseStopped?: boolean
  contactRefused?: boolean
}>

/** The demo is rebuilt around the day it is opened, so the dates always make sense. */
export function createDemoData(now: Date) {
  const today = toDateString(now)
  const patients: Array<Patient> = []
  const orders: Array<Order> = []
  const followUps: Array<FollowUp> = []

  cases.forEach((demo, index) => {
    const patientId = `p-${index + 1}`
    const orderId = `order-${index + 1}`
    const protocol = protocols.find((value) => value.id === demo.protocol)!
    const start = addDays(
      today,
      demo.endsInDays - (protocol.durationDays ?? 30),
    )

    patients.push({
      id: patientId,
      name: demo.name,
      contactAllowed: !demo.contactRefused,
    })
    orders.push({
      id: orderId,
      patientId,
      protocolId: protocol.id,
      orderedAt: demo.basis === 'order' ? start : addDays(start, -3),
      deliveredAt: demo.basis === 'order' ? null : start,
      startedAt: demo.basis === 'declared' ? start : null,
    })
    followUps.push({
      id: `fu-${index + 1}`,
      patientId,
      protocolId: protocol.id,
      sourceOrderId: orderId,
      status: demo.snoozedInDays ? 'snoozed' : 'pending',
      snoozedUntil: demo.snoozedInDays
        ? addDays(today, demo.snoozedInDays)
        : null,
      dismissalReason: null,
      courseStopped: Boolean(demo.courseStopped),
      action: null,
      message: null,
      sentAt: null,
      repeatOrderId: null,
      appointmentAt: null,
    })

    if (demo.renewed)
      orders.push({
        id: `renewal-${orderId}`,
        patientId,
        protocolId: protocol.id,
        orderedAt: today,
        deliveredAt: null,
        startedAt: null,
      })
    // A purchase on another protocol is not a refill and must not hide the follow-up.
    if (demo.unrelatedOrder)
      orders.push({
        id: `unrelated-${orderId}`,
        patientId,
        protocolId: 'proto-2',
        orderedAt: today,
        deliveredAt: null,
        startedAt: null,
      })
  })

  return {
    today,
    practitioner,
    protocols,
    patients,
    orders,
    followUps,
    sequence: 0,
  }
}

export type DemoData = ReturnType<typeof createDemoData>
