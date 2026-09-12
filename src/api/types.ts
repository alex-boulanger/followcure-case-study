export type Practitioner = {
  id: string
  name: string
  /** The 20 % envelope, split between the practitioner and the patient. */
  commission: number
  discount: number
}

export type Patient = {
  id: string
  name: string
  /** A patient can refuse follow-up messages; the queue must respect it. */
  contactAllowed: boolean
}

export type Protocol = {
  id: string
  name: string
  products: Array<{ name: string; quantity: number; price: number }>
  /** Unknown duration: no end date is invented, the record is flagged instead. */
  durationDays: number | null
}

export type Order = {
  id: string
  patientId: string
  protocolId: string
  orderedAt: string
  deliveredAt: string | null
  /** Declared by the patient; the only reliable course start when it exists. */
  startedAt: string | null
}

export type FollowUpStatus = 'pending' | 'sent' | 'snoozed' | 'dismissed'

export type Action = 'refill' | 'appointment' | 'both'

export type FollowUp = {
  id: string
  patientId: string
  protocolId: string
  /** The order that started the course, so an unrelated purchase never hides it. */
  sourceOrderId: string
  status: FollowUpStatus
  snoozedUntil: string | null
  dismissalReason: string | null
  courseStopped: boolean
  action: Action | null
  message: string | null
  sentAt: string | null
  repeatOrderId: string | null
  appointmentAt: string | null
}

/** What the estimated course end is based on, from most to least reliable. */
export type DateBasis = 'declared' | 'delivery' | 'order'

export type FollowUpRow = {
  followUp: FollowUp
  patient: Patient
  protocol: Protocol
  order: Order
  endDate: string | null
  dueDate: string | null
  basis: DateBasis
  eligible: boolean
  /** Why the follow-up is proposed today, or why it is not. */
  reason: string
}

export type Workspace = {
  today: string
  practitioner: Practitioner
  rows: Array<FollowUpRow>
}
