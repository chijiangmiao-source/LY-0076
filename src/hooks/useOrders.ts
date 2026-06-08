import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import { Order, ProofStep, ProofVersion, OrderStatus, WarningInfo, WarningLevel, ManualPriority, ConfirmationResult, ScheduleGroup, ScheduleGroupKey, CalendarTask, ScheduleStats, ORDER_STATUS_MAP } from '../types'
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

function generateVersionNo(versions: ProofVersion[]): string {
  const count = versions.length
  return `V${count + 1}.0`
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

  const pendingVersion = order.versions?.find(v => v.confirmationResult === 'pending')
  if (pendingVersion) {
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
    const loadedOrders = getOrders()
    const migratedOrders = loadedOrders.map(order => ({
      ...order,
      versions: order.versions || [],
      revisionCount: order.revisionCount || 0,
      currentVersionNo: order.currentVersionNo || undefined
    }))
    setOrders(migratedOrders)
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

  const addOrder = useCallback((data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'steps' | 'versions' | 'revisionCount'> & { steps?: ProofStep[]; versions?: ProofVersion[] }) => {
    const now = new Date().toISOString()
    const newOrder: Order = {
      ...data,
      id: generateId(),
      steps: data.steps || [],
      versions: data.versions || [],
      revisionCount: 0,
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

  const addVersion = useCallback((orderId: string, versionData: Omit<ProofVersion, 'id' | 'versionNo' | 'submissionTime'>) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const versionNo = generateVersionNo(o.versions || [])
        const newVersion: ProofVersion = {
          ...versionData,
          id: generateId(),
          versionNo,
          submissionTime: new Date().toISOString()
        }
        return {
          ...o,
          versions: [...(o.versions || []), newVersion],
          currentVersionNo: versionNo,
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [])

  const updateVersion = useCallback((orderId: string, versionId: string, data: Partial<ProofVersion>) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          versions: (o.versions || []).map(v => v.id === versionId ? { ...v, ...data } : v),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [])

  const deleteVersion = useCallback((orderId: string, versionId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          versions: (o.versions || []).filter(v => v.id !== versionId),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [])

  const confirmVersion = useCallback((orderId: string, versionId: string, result: ConfirmationResult, feedback?: string, confirmer?: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updatedVersions = (o.versions || []).map(v => {
          if (v.id === versionId) {
            return {
              ...v,
              confirmationResult: result,
              confirmationTime: new Date().toISOString(),
              feedback,
              confirmer
            }
          }
          return v
        })

        let updatedStatus = o.status
        let updatedSteps = o.steps
        let updatedRevisionCount = o.revisionCount

        if (result === 'needs_revision' || result === 'rejected') {
          updatedStatus = 'proofing'
          updatedRevisionCount = o.revisionCount + 1
          updatedSteps = o.steps.map(s => {
            if (s.name === '客户确认' || s.name.includes('客户') || s.name.includes('确认')) {
              return { ...s, completed: false, completedDate: undefined }
            }
            return s
          })
          if (!updatedSteps.some(s => s.name === '客户确认')) {
            updatedSteps = [
              ...updatedSteps,
              {
                id: generateId(),
                name: '客户确认（返修）',
                assignee: '',
                plannedDate: getTodayStr(),
                completed: false,
                remark: `第 ${updatedRevisionCount} 次返修，需客户重新确认`
              }
            ]
          }
        } else if (result === 'approved') {
          if (o.status === 'proofing') {
            const allStepsCompleted = o.steps.every(s => s.completed)
            if (allStepsCompleted) {
              updatedStatus = 'pending_print'
            }
          }
        }

        return {
          ...o,
          versions: updatedVersions,
          status: updatedStatus,
          steps: updatedSteps,
          revisionCount: updatedRevisionCount,
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [orders])

  const isPendingConfirmation = useCallback((order: Order): boolean => {
    return (order.versions || []).some(v => v.confirmationResult === 'pending')
  }, [])

  const isMultipleRevisions = useCallback((order: Order): boolean => {
    return order.revisionCount >= 2
  }, [])

  const canMarkCompleted = useCallback((order: Order): boolean => {
    if (order.steps.length === 0) return false
    return order.steps.every(s => s.completed)
  }, [])

  const getSortedOrders = useCallback((ordersToSort: Order[]): Order[] => {
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
  }, [warningMap, isPendingConfirmation, isMultipleRevisions])

  const filterByWarningLevel = useCallback((ordersToFilter: Order[], level: WarningLevel | 'all'): Order[] => {
    if (level === 'all') return ordersToFilter
    return ordersToFilter.filter(o => {
      const w = warningMap[o.id]
      return w && w.level === level
    })
  }, [warningMap])

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
  }, [])

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
  }, [])

  const batchPostponeOrders = useCallback((orderIds: string[], days: number) => {
    setOrders(prev => prev.map(o => {
      if (orderIds.includes(o.id) && o.scheduleDate) {
        const currentDate = new Date(o.scheduleDate)
        currentDate.setDate(currentDate.getDate() + days)
        const newScheduleDate = currentDate.toISOString().split('T')[0]
        const updatedSteps = o.steps.map(step => {
          if (step.plannedDate) {
            const stepDate = new Date(step.plannedDate)
            stepDate.setDate(stepDate.getDate() + days)
            return {
              ...step,
              plannedDate: stepDate.toISOString().split('T')[0]
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
  }, [])

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
  }, [warningMap, isPendingConfirmation, isMultipleRevisions])

  const getCalendarTasks = useCallback((ordersForCalendar: Order[], startDate: string, endDate: string): CalendarTask[] => {
    const tasks: CalendarTask[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    ordersForCalendar.forEach(order => {
      const warning = warningMap[order.id] || { level: 'normal' as WarningLevel }

      if (order.scheduleDate) {
        const sDate = new Date(order.scheduleDate)
        if (sDate >= start && sDate <= end) {
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
        if (step.plannedDate && !step.completed) {
          const sDate = new Date(step.plannedDate)
          if (sDate >= start && sDate <= end) {
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
        }
      })

      order.versions.forEach(version => {
        if (version.confirmationResult === 'pending' && version.submissionTime) {
          const subDate = new Date(version.submissionTime.split('T')[0])
          if (subDate >= start && subDate <= end) {
            tasks.push({
              id: `version-${order.id}-${version.id}`,
              orderId: order.id,
              orderNo: order.orderNo,
              customerName: order.customerName,
              date: version.submissionTime.split('T')[0],
              type: 'version_submit',
              title: `版本${version.versionNo}待确认 - ${order.customerName}`,
              warningLevel: warning.level
            })
          }
        }
      })

      const expDate = new Date(order.expectedDate)
      if (expDate >= start && expDate <= end && order.status !== 'completed' && order.status !== 'cancelled') {
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
