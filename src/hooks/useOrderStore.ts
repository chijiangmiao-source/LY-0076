import { useState, useEffect, useCallback } from 'preact/hooks'
import { Order, ProofStep, ProofVersion, ManualPriority } from '../types'
import { getOrders, saveOrders, generateId, generateOrderNo, isOrderNoExists } from '../storage'

export type OrderUpdateFn = (prev: Order[]) => Order[]
export type SetOrdersFn = (value: Order[] | ((prev: Order[]) => Order[])) => void

export interface UseOrderStoreReturn {
  orders: Order[]
  setOrders: SetOrdersFn
  updateOrders: (updater: OrderUpdateFn) => void
  addOrder: (data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'steps' | 'versions' | 'revisionCount'> & { steps?: ProofStep[]; versions?: ProofVersion[] }) => Order
  updateOrder: (id: string, data: Partial<Order>) => void
  deleteOrder: (id: string) => void
  updateManualPriority: (id: string, priority: ManualPriority) => void
  generateOrderNo: () => string
  isOrderNoExists: (orderNo: string, excludeId?: string) => boolean
}

export function useOrderStore(): UseOrderStoreReturn {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    const loadedOrders = getOrders()
    const migratedOrders = loadedOrders.map(order => ({
      ...order,
      versions: order.versions || [],
      revisionCount: order.revisionCount || 0,
      currentVersionNo: order.currentVersionNo || undefined
    }))
    setOrders(migratedOrders)
  }, [])

  useEffect(() => {
    if (orders.length > 0 || localStorage.getItem('business_card_orders')) {
      saveOrders(orders)
    }
  }, [orders])

  const updateOrders = useCallback((updater: OrderUpdateFn) => {
    setOrders(prev => updater(prev))
  }, [])

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

  return {
    orders,
    setOrders,
    updateOrders,
    addOrder,
    updateOrder,
    deleteOrder,
    updateManualPriority,
    generateOrderNo,
    isOrderNoExists
  }
}
