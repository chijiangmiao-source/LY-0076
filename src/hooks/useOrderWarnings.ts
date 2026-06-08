import { useState, useEffect, useMemo } from 'preact/hooks'
import { Order, WarningInfo } from '../types'
import { getWarningCache, saveWarningCache } from '../storage'
import { getDaysBetween, getTodayStr } from '../utils/dateUtils'
import { isPendingConfirmation } from '../utils/orderUtils'

export function calculateWarning(order: Order): WarningInfo {
  if (order.status === 'completed' || order.status === 'cancelled') {
    return {
      level: 'normal',
      daysRemaining: 0,
      reason: order.status === 'completed' ? '订单已完成' : '订单已取消'
    }
  }

  const today = getTodayStr()
  const daysRemaining = getDaysBetween(today, order.expectedDate)
  const totalSteps = order.steps.length
  const completedSteps = order.steps.filter(s => s.completed).length
  const progressRatio = totalSteps > 0 ? completedSteps / totalSteps : 0
  const totalDays = getDaysBetween(order.orderDate, order.expectedDate)
  const elapsedDays = getDaysBetween(order.orderDate, today)
  const timeRatio = totalDays > 0 ? elapsedDays / totalDays : 1

  if (daysRemaining < 0) {
    return {
      level: 'overdue',
      daysRemaining,
      reason: `订单已逾期 ${Math.abs(daysRemaining)} 天`
    }
  }

  let urgentReasons: string[] = []

  if (daysRemaining <= 2) {
    urgentReasons.push(`距离交付仅剩 ${daysRemaining} 天`)
  }

  if (order.isUrgent && daysRemaining <= 5) {
    urgentReasons.push('加急订单')
  }

  if (totalDays > 0 && elapsedDays > 0 && progressRatio < timeRatio * 0.7 && daysRemaining <= 7) {
    urgentReasons.push('打样进度落后于时间进度')
  }

  if (isPendingConfirmation(order)) {
    urgentReasons.push('有待客户回稿确认的版本')
  }

  if (urgentReasons.length > 0) {
    return {
      level: 'urgent',
      daysRemaining,
      reason: urgentReasons.join('；')
    }
  }

  return {
    level: 'normal',
    daysRemaining,
    reason: `距离交付还有 ${daysRemaining} 天`
  }
}

export interface UseOrderWarningsReturn {
  warningMap: Record<string, WarningInfo>
}

export function useOrderWarnings(orders: Order[]): UseOrderWarningsReturn {
  const [warningCache, setWarningCache] = useState<Record<string, WarningInfo>>({})

  useEffect(() => {
    setWarningCache(getWarningCache())
  }, [])

  const warningMap = useMemo(() => {
    const map: Record<string, WarningInfo> = {}
    orders.forEach(order => {
      map[order.id] = calculateWarning(order)
    })
    return map
  }, [orders])

  useEffect(() => {
    saveWarningCache(warningMap)
    setWarningCache(warningMap)
  }, [warningMap])

  return { warningMap }
}
