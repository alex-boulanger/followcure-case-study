import { createFileRoute } from '@tanstack/react-router'
import { FollowUpQueue } from '#/features/follow-cure/queue'

export const Route = createFileRoute('/_app/suivis')({
  component: FollowUpQueue,
})
