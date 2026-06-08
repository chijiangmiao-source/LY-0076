export function getDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = d2.getTime() - d1.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  const date = new Date(dateStr)
  const start = new Date(startDate)
  const end = new Date(endDate)
  return date >= start && date <= end
}
