import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '#/api/follow-ups'
import type { Action } from '#/api/types'

const workspaceKey = ['followcure-workspace']

export function useWorkspace() {
  return useQuery({
    queryKey: workspaceKey,
    queryFn: api.getWorkspace,
    retry: 1,
  })
}

type Command =
  | { type: 'send'; id: string; action: Action; message: string }
  | { type: 'snooze'; id: string; until: string }
  | { type: 'dismiss'; id: string; reason: string }
  | { type: 'patient-order' | 'patient-appointment'; id: string }
  | { type: 'advance' | 'reset' }

/** One mutation for every practitioner or patient action: the API owns the rules. */
export function useFollowCureMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (command: Command) => {
      switch (command.type) {
        case 'send':
          return api.sendFollowUp(command)
        case 'snooze':
          return api.snoozeFollowUp(command)
        case 'dismiss':
          return api.dismissFollowUp(command)
        case 'patient-order':
          return api.recordPatientOrder(command.id)
        case 'patient-appointment':
          return api.recordPatientAppointment(command.id)
        case 'advance':
          return api.advanceDemoClock()
        case 'reset':
          return api.resetDemo()
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: workspaceKey }),
  })
}
