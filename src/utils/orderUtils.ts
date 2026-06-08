import { Order, ProofVersion, WarningLevel, WarningInfo, ManualPriority } from '../types'

export const WARNING_LEVEL_ORDER: Record<WarningLevel, number> = {
  overdue: 0,
  urgent: 1,
  normal: 2
}

export const MANUAL_PRIORITY_ORDER: Record<ManualPriority, number> = {
  high: 0,
  medium: 1,
  auto: 2,
  low: 3
}

export function generateVersionNo(versions: ProofVersion[]): string {
  const count = versions.length
  return `V${count + 1}.0`
}

export function isPendingConfirmation(order: Order): boolean {
  return (order.versions || []).some(v => v.confirmationResult === 'pending')
}

export function isMultipleRevisions(order: Order): boolean {
  return order.revisionCount >= 2
}

export function canMarkCompleted(order: Order): boolean {
  if (order.steps.length === 0) return false
  return order.steps.every(s => s.completed)
}

export interface SortOptions {
  warningMap: Record<string, WarningInfo>
}

export function sortOrders(
  ordersToSort: Order[],
  options: SortOptions
): Order[] {
  const { warningMap } = options
  return [...ordersToSort].sort((a, b) => {
    const aPending = isPendingConfirmation(a)
    const bPending = isPendingConfirmation(b)
    if (aPending !== bPending) {
      return aPending ? -1 : 1
    }

    const aMulti = isMultipleRevisions(a)
    const bMulti = isMultipleRevisions(b)
    if (aMulti !== bMulti) {
      return aMulti ? -1 : 1
    }

    const aManual = a.manualPriority || 'auto'
    const bManual = b.manualPriority || 'auto'
    if (aManual !== bManual && (aManual !== 'auto' || bManual !== 'auto')) {
      if (aManual === 'auto') return 1
      if (bManual === 'auto') return -1
      return MANUAL_PRIORITY_ORDER[aManual] - MANUAL_PRIORITY_ORDER[bManual]
    }

    const aWarning = warningMap[a.id]
    const bWarning = warningMap[b.id]
    if (aWarning && bWarning) {
      const levelDiff = WARNING_LEVEL_ORDER[aWarning.level] - WARNING_LEVEL_ORDER[bWarning.level]
      if (levelDiff !== 0) return levelDiff
    }

    if (a.isUrgent !== b.isUrgent) {
      return a.isUrgent ? -1 : 1
    }

    return a.expectedDate.localeCompare(b.expectedDate)
  })
}

export function filterByWarningLevel(
  ordersToFilter: Order[],
  level: WarningLevel | 'all',
  warningMap: Record<string, WarningInfo>
): Order[] {
  if (level === 'all') return ordersToFilter
  return ordersToFilter.filter(o => {
    const w = warningMap[o.id]
    return w && w.level === level
  })
}
