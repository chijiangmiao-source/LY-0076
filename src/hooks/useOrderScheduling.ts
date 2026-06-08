import { useCallback } from 'preact/hooks'
import { addDays } from '../utils/dateUtils'
import { SetOrdersFn } from './useOrderStore'

export interface UseOrderSchedulingReturn {
  setScheduleDate: (orderId: string, scheduleDate: string | undefined) => void
  batchScheduleOrders: (orderIds: string[], scheduleDate: string) => void
  batchPostponeOrders: (orderIds: string[], days: number) => void
}

export function useOrderScheduling(setOrders: SetOrdersFn): UseOrderSchedulingReturn {
  const setScheduleDate = useCallback((orderId: string, scheduleDate: string | undefined) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        let updatedSteps = o.steps
        if (scheduleDate) {
          const baseDate = new Date(scheduleDate)
          updatedSteps = o.steps.map((step, idx) => {
            const stepDate = new Date(baseDate)
            stepDate.setDate(stepDate.getDate() + idx)
            return {
              ...step,
              plannedDate: stepDate.toISOString().split('T')[0]
            }
          })
        }
        return {
          ...o,
          scheduleDate,
          steps: updatedSteps,
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  const batchScheduleOrders = useCallback((orderIds: string[], scheduleDate: string) => {
    setOrders(prev => prev.map(o => {
      if (orderIds.includes(o.id)) {
        const baseDate = new Date(scheduleDate)
        const orderIdx = orderIds.indexOf(o.id)
        baseDate.setDate(baseDate.getDate() + Math.floor(orderIdx / 3))
        const actualDate = baseDate.toISOString().split('T')[0]
        const updatedSteps = o.steps.map((step, idx) => {
          const stepDate = new Date(baseDate)
          stepDate.setDate(stepDate.getDate() + idx)
          return {
            ...step,
            plannedDate: stepDate.toISOString().split('T')[0]
          }
        })
        return {
          ...o,
          scheduleDate: actualDate,
          steps: updatedSteps,
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  const batchPostponeOrders = useCallback((orderIds: string[], days: number) => {
    setOrders(prev => prev.map(o => {
      if (orderIds.includes(o.id) && o.scheduleDate) {
        const newScheduleDate = addDays(o.scheduleDate, days)
        const updatedSteps = o.steps.map(step => {
          if (step.plannedDate) {
            return {
              ...step,
              plannedDate: addDays(step.plannedDate, days)
            }
          }
          return step
        })
        return {
          ...o,
          scheduleDate: newScheduleDate,
          steps: updatedSteps,
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  return {
    setScheduleDate,
    batchScheduleOrders,
    batchPostponeOrders
  }
}
