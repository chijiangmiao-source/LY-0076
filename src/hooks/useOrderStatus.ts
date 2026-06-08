import { useCallback } from 'preact/hooks'
import { Order, OrderStatus, WarningInfo } from '../types'
import { getTodayStr } from '../utils/dateUtils'
import { SetOrdersFn } from './useOrderStore'

export interface UseOrderStatusReturn {
  canTransitionTo: (order: Order, targetStatus: OrderStatus) => { allowed: boolean; reason?: string }
  updateOrderStatus: (id: string, status: OrderStatus) => void
}

export function useOrderStatus(
  setOrders: SetOrdersFn,
  orders: Order[],
  warningMap: Record<string, WarningInfo>
): UseOrderStatusReturn {
  const canTransitionTo = useCallback((order: Order, targetStatus: OrderStatus): { allowed: boolean; reason?: string } => {
    if (targetStatus === order.status) {
      return { allowed: false, reason: '目标状态与当前状态相同' }
    }

    const warning = warningMap[order.id]
    if (warning && warning.level === 'overdue' && order.status !== 'completed' && order.status !== 'cancelled') {
      if (targetStatus !== 'completed' && targetStatus !== 'cancelled') {
        return {
          allowed: false,
          reason: '该订单已逾期，仅可流转为"已完成"或"已取消"状态'
        }
      }
    }

    return { allowed: true }
  }, [warningMap])

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    const order = orders.find(o => o.id === id)
    if (!order) return

    const check = canTransitionTo(order, status)
    if (!check.allowed) {
      alert(check.reason || '无法流转状态')
      return
    }

    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        let updatedSteps = o.steps
        if (status === 'completed') {
          updatedSteps = o.steps.map(s => ({
            ...s,
            completed: true,
            completedDate: s.completedDate || getTodayStr()
          }))
        }
        return {
          ...o,
          status,
          steps: updatedSteps,
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [orders, canTransitionTo, setOrders])

  return {
    canTransitionTo,
    updateOrderStatus
  }
}
