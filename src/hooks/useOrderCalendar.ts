import { useCallback } from 'preact/hooks'
import { Order, WarningLevel, WarningInfo, ScheduleGroup, CalendarTask, ORDER_STATUS_MAP, OrderStatus } from '../types'
import { isDateInRange } from '../utils/dateUtils'
import { isPendingConfirmation, isMultipleRevisions } from '../utils/orderUtils'

export interface UseOrderCalendarReturn {
  getScheduleGroups: (ordersToGroup: Order[]) => ScheduleGroup[]
  getCalendarTasks: (ordersForCalendar: Order[], startDate: string, endDate: string) => CalendarTask[]
}

export function useOrderCalendar(warningMap: Record<string, WarningInfo>): UseOrderCalendarReturn {
  const getScheduleGroups = useCallback((ordersToGroup: Order[]): ScheduleGroup[] => {
    const groups: ScheduleGroup[] = []
    const activeOrders = ordersToGroup.filter(o => o.status !== 'completed' && o.status !== 'cancelled')

    const statusGroups: Record<string, Order[]> = {}
    activeOrders.forEach(o => {
      if (!statusGroups[o.status]) statusGroups[o.status] = []
      statusGroups[o.status].push(o)
    })
    Object.entries(statusGroups).forEach(([status, ords]) => {
      groups.push({ key: 'status', label: `状态: ${ORDER_STATUS_MAP[status as OrderStatus]?.label || status}`, orders: ords })
    })

    const urgentOrders = activeOrders.filter(o => o.isUrgent)
    if (urgentOrders.length > 0) {
      groups.push({ key: 'urgent', label: '加急订单', orders: urgentOrders })
    }

    const overdueRiskOrders = activeOrders.filter(o => {
      const w = warningMap[o.id]
      return w && (w.level === 'overdue' || w.level === 'urgent')
    })
    if (overdueRiskOrders.length > 0) {
      groups.push({ key: 'overdue_risk', label: '逾期风险', orders: overdueRiskOrders })
    }

    const pendingConfirmOrders = activeOrders.filter(o => isPendingConfirmation(o))
    if (pendingConfirmOrders.length > 0) {
      groups.push({ key: 'pending_confirm', label: '待回稿确认', orders: pendingConfirmOrders })
    }

    const multiRevisionOrders = activeOrders.filter(o => isMultipleRevisions(o))
    if (multiRevisionOrders.length > 0) {
      groups.push({ key: 'revision_count', label: `多次返修 (≥2次)`, orders: multiRevisionOrders })
    }

    return groups
  }, [warningMap])

  const getCalendarTasks = useCallback((ordersForCalendar: Order[], startDate: string, endDate: string): CalendarTask[] => {
    const tasks: CalendarTask[] = []

    ordersForCalendar.forEach(order => {
      const warning = warningMap[order.id] || { level: 'normal' as WarningLevel }

      if (order.scheduleDate) {
        if (isDateInRange(order.scheduleDate, startDate, endDate)) {
          tasks.push({
            id: `schedule-${order.id}`,
            orderId: order.id,
            orderNo: order.orderNo,
            customerName: order.customerName,
            date: order.scheduleDate,
            type: 'schedule',
            title: `排产开始 - ${order.customerName}`,
            warningLevel: warning.level
          })
        }
      }

      order.steps.forEach(step => {
        if (step.plannedDate && !step.completed && isDateInRange(step.plannedDate, startDate, endDate)) {
          tasks.push({
            id: `step-${order.id}-${step.id}`,
            orderId: order.id,
            orderNo: order.orderNo,
            customerName: order.customerName,
            date: step.plannedDate,
            type: 'step_due',
            title: `${step.name} - ${order.customerName}`,
            warningLevel: warning.level
          })
        }
      })

      order.versions.forEach(version => {
        if (version.confirmationResult === 'pending' && version.submissionTime) {
          const subDateStr = version.submissionTime.split('T')[0]
          if (isDateInRange(subDateStr, startDate, endDate)) {
            tasks.push({
              id: `version-${order.id}-${version.id}`,
              orderId: order.id,
              orderNo: order.orderNo,
              customerName: order.customerName,
              date: subDateStr,
              type: 'version_submit',
              title: `版本${version.versionNo}待确认 - ${order.customerName}`,
              warningLevel: warning.level
            })
          }
        }
      })

      if (isDateInRange(order.expectedDate, startDate, endDate) && order.status !== 'completed' && order.status !== 'cancelled') {
        tasks.push({
          id: `delivery-${order.id}`,
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName,
          date: order.expectedDate,
          type: 'delivery',
          title: `预计交付 - ${order.customerName}`,
          warningLevel: warning.level
        })
      }
    })

    return tasks.sort((a, b) => a.date.localeCompare(b.date))
  }, [warningMap])

  return {
    getScheduleGroups,
    getCalendarTasks
  }
}
