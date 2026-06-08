import { useCallback } from 'preact/hooks'
import { Order, WarningInfo, ScheduleStats } from '../types'
import { getTodayStr } from '../utils/dateUtils'

export interface UseOrderStatsReturn {
  getScheduleStats: () => ScheduleStats
}

export function useOrderStats(
  orders: Order[],
  warningMap: Record<string, WarningInfo>
): UseOrderStatsReturn {
  const getScheduleStats = useCallback((): ScheduleStats => {
    const today = getTodayStr()
    const scheduledOrders = orders.filter(o => o.scheduleDate && o.status !== 'completed' && o.status !== 'cancelled')
    const totalScheduled = scheduledOrders.length

    const delayedOrders = scheduledOrders.filter(o => {
      const w = warningMap[o.id]
      return w && (w.level === 'overdue' || w.level === 'urgent')
    })
    const totalDelayed = delayedOrders.length

    const completedOnTime = orders.filter(o => {
      if (o.status !== 'completed') return false
      return !warningMap[o.id] || warningMap[o.id].level === 'normal'
    }).length
    const totalCompleted = orders.filter(o => o.status === 'completed').length

    const loadRate = totalScheduled > 0 ? Math.round((totalScheduled / Math.max(totalScheduled + 3, 10)) * 100) : 0
    const delayRiskRate = totalScheduled > 0 ? Math.round((totalDelayed / totalScheduled) * 100) : 0
    const completionRate = totalCompleted > 0 ? Math.round((completedOnTime / totalCompleted) * 100) : 0

    const dailyLoad: Record<string, number> = {}
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    for (let i = 0; i < 14; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      dailyLoad[dateStr] = scheduledOrders.filter(o => o.scheduleDate === dateStr).length
    }

    return {
      loadRate,
      delayRiskRate,
      completionRate,
      totalScheduled,
      totalDelayed,
      totalCompletedOnTime: completedOnTime,
      dailyLoad
    }
  }, [orders, warningMap])

  return {
    getScheduleStats
  }
}
