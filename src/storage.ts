import { Order } from './types'

const STORAGE_KEY = 'business_card_orders'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function generateOrderNo(): string {
  const now = new Date()
  const date = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0')
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `BC${date}${rand}`
}

export function getOrders(): Order[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data) as Order[]
    }
  } catch (e) {
    console.error('读取订单数据失败:', e)
  }
  return []
}

export function saveOrders(orders: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch (e) {
    console.error('保存订单数据失败:', e)
  }
}

export function isOrderNoExists(orderNo: string, excludeId?: string): boolean {
  const orders = getOrders()
  return orders.some(o => o.orderNo === orderNo && o.id !== excludeId)
}
