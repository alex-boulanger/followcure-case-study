import { createFileRoute } from '@tanstack/react-router'
import { PatientList } from '#/features/patients/patient-list'

export const Route = createFileRoute('/_app/patients')({
  component: PatientList,
})
