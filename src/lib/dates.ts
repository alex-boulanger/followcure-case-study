/** Dates are plain `YYYY-MM-DD` strings: a course start is a day, not an instant. */
export const toDateString = (date: Date) =>
  [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')

const noon = (date: string) => new Date(`${date}T12:00:00Z`)

export const addDays = (date: string, days: number) => {
  const value = noon(date)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export const daysBetween = (from: string, to: string) =>
  Math.round((noon(to).getTime() - noon(from).getTime()) / 86_400_000)

export const formatDate = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(noon(date))
    : 'Non renseignée'
