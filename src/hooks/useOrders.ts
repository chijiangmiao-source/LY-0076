import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import { Order, ProofStep, OrderStatus, WarningInfo, WarningLevel, ManualPriority } from '../types'
import { getOrders, saveOrders, generateId, generateOrderNo, isOrderNoExists, getWarningCache, saveWarningCache } from '../storage'

export interface ValidationErrors {
  orderNo?: string
  customerName?: string
  companyName?: string
  orderDate?: string
  expectedDate?: string
  general?: string
}

function getDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = d2.getTime() - d1.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

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

const WARNING_LEVEL_ORDER: Record<WarningLevel, number> = {
  overdue: 0,
  urgent: 1,
  normal: 2
}

const MANUAL_PRIORITY_ORDER: Record<ManualPriority, number> = {
  high: 0,
  medium: 1,
  auto: 2,
  low: 3
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [warningCache, setWarningCache] = useState<Record<string, WarningInfo>>({})

  useEffect(() => {
    setOrders(getOrders())
    setWarningCache(getWarningCache())
  }, [])

  useEffect(() => {
    if (orders.length > 0 || localStorage.getItem('business_card_orders')) {
      saveOrders(orders)
    }
  }, [orders])

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

  const addOrder = useCallback((data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'steps'> & { steps?: ProofStep[] }) => {
    const now = new Date().toISOString()
    const newOrder: Order = {
      ...data,
      id: generateId(),
      steps: data.steps || [],
      createdAt: now,
      updatedAt: now
    }
    setOrders(prev => [newOrder, ...prev])
    return newOrder
  }, [])

  const updateOrder = useCallback((id: string, data: Partial<Order>) => {
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o
    ))
  }, [])

  const deleteOrder = useCallback((id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id))
  }, [])

  const updateManualPriority = useCallback((id: string, priority: ManualPriority) => {
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, manualPriority: priority, updatedAt: new Date().toISOString() } : o
    ))
  }, [])

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
            completedDate: s.completedDate || new Date().toISOString().split('T')[0]
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
  }, [orders, canTransitionTo])

  const addStep = useCallback((orderId: string, step: Omit<ProofStep, 'id'>) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const newStep: ProofStep = { ...step, id: generateId() }
        return {
          ...o,
          steps: [...o.steps, newStep],
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [])

  const updateStep = useCallback((orderId: string, stepId: string, data: Partial<ProofStep>) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          steps: o.steps.map(s => s.id === stepId ? { ...s, ...data } : s),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [])

  const deleteStep = useCallback((orderId: string, stepId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          steps: o.steps.filter(s => s.id !== stepId),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [])

  const toggleStepComplete = useCallback((orderId: string, stepId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          steps: o.steps.map(s => {
            if (s.id === stepId) {
              const completed = !s.completed
              return {
                ...s,
                completed,
                completedDate: completed ? new Date().toISOString().split('T')[0] : undefined
              }
            }
            return s
          }),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [])

  const canMarkCompleted = useCallback((order: Order): boolean => {
    if (order.steps.length === 0) return false
    return order.steps.every(s => s.completed)
  }, [])

  const getSortedOrders = useCallback((ordersToSort: Order[]): Order[] => {
    return [...ordersToSort].sort((a, b) => {
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
  }, [warningMap])

  const filterByWarningLevel = useCallback((ordersToFilter: Order[], level: WarningLevel | 'all'): Order[] => {
    if (level === 'all') return ordersToFilter
    return ordersToFilter.filter(o => {
      const w = warningMap[o.id]
      return w && w.level === level
    })
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
    canMarkCompleted,
    canTransitionTo,
    updateManualPriority,
    getSortedOrders,
    filterByWarningLevel,
    generateOrderNo,
    isOrderNoExists
  }
}

function isValidName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (/^\d+$/.test(trimmed)) return false
  if (/^[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?~`]+$/.test(trimmed)) return false
  if (/[\uFFFD\uFFFE\uFFFF]/.test(trimmed)) return false
  const hasValidChar = /[\u4e00-\u9fa5a-zA-Z]/.test(trimmed)
  return hasValidChar
}

export function validateOrder(
  data: {
    orderNo: string
    customerName: string
    companyName: string
    orderDate: string
    expectedDate: string
  },
  excludeId?: string
): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!data.orderNo.trim()) {
    errors.orderNo = '订单编号不能为空'
  } else if (isOrderNoExists(data.orderNo.trim(), excludeId)) {
    errors.orderNo = '订单编号已存在'
  }

  if (!data.customerName.trim()) {
    errors.customerName = '客户姓名不能为空'
  } else if (!isValidName(data.customerName)) {
    errors.customerName = '客户姓名格式不正确，请输入有效的中文或英文姓名'
  }

  if (!data.companyName.trim()) {
    errors.companyName = '公司名称不能为空'
  } else if (!isValidName(data.companyName)) {
    errors.companyName = '公司名称格式不正确，请输入有效的公司名称'
  }

  if (!data.orderDate) {
    errors.orderDate = '请选择下单日期'
  } else {
    const today = new Date().toISOString().split('T')[0]
    if (data.orderDate > today) {
      errors.orderDate = '下单日期不能晚于当前日期'
    }
  }

  if (!data.expectedDate) {
    errors.expectedDate = '请选择预计交付日期'
  } else if (data.orderDate && data.expectedDate < data.orderDate) {
    errors.expectedDate = '预计交付日期不能早于下单日期'
  }

  return errors
}
