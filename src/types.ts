export type OrderStatus = 'pending_layout' | 'proofing' | 'pending_print' | 'completed' | 'cancelled'

export interface ProofStep {
  id: string
  name: string
  assignee: string
  plannedDate: string
  completed: boolean
  completedDate?: string
  remark: string
}

export interface Order {
  id: string
  orderNo: string
  customerName: string
  companyName: string
  cardSpec: string
  orderDate: string
  expectedDate: string
  status: OrderStatus
  isUrgent: boolean
  steps: ProofStep[]
  createdAt: string
  updatedAt: string
}

export type OrderStatusMap = Record<OrderStatus, { label: string; color: string; bgColor: string }>

export const ORDER_STATUS_MAP: OrderStatusMap = {
  pending_layout: { label: '待排版', color: '#6b7280', bgColor: '#f3f4f6' },
  proofing: { label: '打样中', color: '#2563eb', bgColor: '#dbeafe' },
  pending_print: { label: '待印刷', color: '#d97706', bgColor: '#fef3c7' },
  completed: { label: '已完成', color: '#059669', bgColor: '#d1fae5' },
  cancelled: { label: '已取消', color: '#dc2626', bgColor: '#fee2e2' }
}

export const CARD_SPEC_OPTIONS = [
  '90×54mm 标准',
  '85×54mm 圆角',
  '90×50mm 窄版',
  '100×60mm 大尺寸',
  '自定义规格'
]
