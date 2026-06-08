import { useState, useEffect, useCallback } from 'preact/hooks'
import { Order, ProofStep, OrderStatus } from '../types'
import { getOrders, saveOrders, generateId, generateOrderNo, isOrderNoExists } from '../storage'

export interface ValidationErrors {
  orderNo?: string
  customerName?: string
  companyName?: string
  orderDate?: string
  expectedDate?: string
  general?: string
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    setOrders(getOrders())
  }, [])

  useEffect(() => {
    if (orders.length > 0 || localStorage.getItem('business_card_orders')) {
      saveOrders(orders)
    }
  }, [orders])

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

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
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
  }, [])

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

  return {
    orders,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    addStep,
    updateStep,
    deleteStep,
    toggleStepComplete,
    canMarkCompleted,
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
