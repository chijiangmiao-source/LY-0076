import { useCallback } from 'preact/hooks'
import { Order, WarningLevel, WarningInfo } from '../types'
import { useOrderStore } from './useOrderStore'
import { useOrderWarnings, calculateWarning } from './useOrderWarnings'
import { useOrderSteps } from './useOrderSteps'
import { useOrderVersions } from './useOrderVersions'
import { useOrderStatus } from './useOrderStatus'
import { useOrderScheduling } from './useOrderScheduling'
import { useOrderCalendar } from './useOrderCalendar'
import { useOrderStats } from './useOrderStats'
import {
  isPendingConfirmation,
  isMultipleRevisions,
  canMarkCompleted,
  sortOrders,
  filterByWarningLevel as filterByWarningLevelUtil,
  SortOptions
} from '../utils/orderUtils'
import { validateOrder, ValidationErrors } from '../utils/validation'

export { calculateWarning, validateOrder }
export type { ValidationErrors }

export function useOrders() {
  const store = useOrderStore()
  const { orders, setOrders, addOrder, updateOrder, deleteOrder, updateManualPriority, generateOrderNo, isOrderNoExists } = store

  const { warningMap } = useOrderWarnings(orders)
  const { addStep, updateStep, deleteStep, toggleStepComplete } = useOrderSteps(setOrders)
  const { addVersion, updateVersion, deleteVersion, confirmVersion } = useOrderVersions(setOrders, orders)
  const { canTransitionTo, updateOrderStatus } = useOrderStatus(setOrders, orders, warningMap)
  const { setScheduleDate, batchScheduleOrders, batchPostponeOrders } = useOrderScheduling(setOrders)
  const { getScheduleGroups, getCalendarTasks } = useOrderCalendar(warningMap)
  const { getScheduleStats } = useOrderStats(orders, warningMap)

  const getSortedOrders = useCallback((ordersToSort: Order[]): Order[] => {
    const options: SortOptions = { warningMap }
    return sortOrders(ordersToSort, options)
  }, [warningMap])

  const filterByWarningLevel = useCallback((ordersToFilter: Order[], level: WarningLevel | 'all'): Order[] => {
    return filterByWarningLevelUtil(ordersToFilter, level, warningMap)
  }, [warningMap])

  return {
    orders,
    warningMap,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    addStep,
    updateStep,
    deleteStep,
    toggleStepComplete,
    addVersion,
    updateVersion,
    deleteVersion,
    confirmVersion,
    isPendingConfirmation,
    isMultipleRevisions,
    canMarkCompleted,
    canTransitionTo,
    updateManualPriority,
    getSortedOrders,
    filterByWarningLevel,
    generateOrderNo,
    isOrderNoExists,
    setScheduleDate,
    batchScheduleOrders,
    batchPostponeOrders,
    getScheduleGroups,
    getCalendarTasks,
    getScheduleStats
  }
}
