export type OrderStatus = 'pending_layout' | 'proofing' | 'pending_print' | 'completed' | 'cancelled'

export type WarningLevel = 'normal' | 'urgent' | 'overdue'

export interface WarningInfo {
  level: WarningLevel
  daysRemaining: number
  reason: string
}

export type ManualPriority = 'auto' | 'high' | 'medium' | 'low'

export type UploadStatus = 'not_uploaded' | 'uploading' | 'uploaded' | 'upload_failed'

export type ConfirmationResult = 'pending' | 'approved' | 'rejected' | 'needs_revision'

export interface ProofVersion {
  id: string
  versionNo: string
  submissionTime: string
  modificationNotes: string
  uploadStatus: UploadStatus
  confirmationResult: ConfirmationResult
  confirmationTime?: string
  confirmer?: string
  feedback?: string
}

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
  versions: ProofVersion[]
  currentVersionNo?: string
  revisionCount: number
  createdAt: string
  updatedAt: string
  manualPriority?: ManualPriority
  scheduleDate?: string
}

export const WARNING_LEVEL_MAP: Record<WarningLevel, { label: string; color: string; bgColor: string }> = {
  normal: { label: '正常', color: '#059669', bgColor: '#d1fae5' },
  urgent: { label: '紧急', color: '#d97706', bgColor: '#fef3c7' },
  overdue: { label: '已逾期', color: '#dc2626', bgColor: '#fee2e2' }
}

export const MANUAL_PRIORITY_MAP: Record<ManualPriority, { label: string; color: string }> = {
  auto: { label: '自动', color: '#6b7280' },
  high: { label: '高', color: '#dc2626' },
  medium: { label: '中', color: '#d97706' },
  low: { label: '低', color: '#059669' }
}

export const UPLOAD_STATUS_MAP: Record<UploadStatus, { label: string; color: string; bgColor: string }> = {
  not_uploaded: { label: '未上传', color: '#6b7280', bgColor: '#f3f4f6' },
  uploading: { label: '上传中', color: '#d97706', bgColor: '#fef3c7' },
  uploaded: { label: '已上传', color: '#059669', bgColor: '#d1fae5' },
  upload_failed: { label: '上传失败', color: '#dc2626', bgColor: '#fee2e2' }
}

export const CONFIRMATION_RESULT_MAP: Record<ConfirmationResult, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待确认', color: '#d97706', bgColor: '#fef3c7' },
  approved: { label: '已通过', color: '#059669', bgColor: '#d1fae5' },
  rejected: { label: '已拒绝', color: '#dc2626', bgColor: '#fee2e2' },
  needs_revision: { label: '需修改', color: '#7c3aed', bgColor: '#ede9fe' }
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

export type ScheduleGroupKey = 'status' | 'urgent' | 'overdue_risk' | 'pending_confirm' | 'revision_count'

export interface ScheduleGroup {
  key: ScheduleGroupKey
  label: string
  orders: Order[]
}

export interface CalendarTask {
  id: string
  orderId: string
  orderNo: string
  customerName: string
  date: string
  type: 'schedule' | 'step_due' | 'version_submit' | 'delivery'
  title: string
  warningLevel: WarningLevel
}

export interface ScheduleStats {
  loadRate: number
  delayRiskRate: number
  completionRate: number
  totalScheduled: number
  totalDelayed: number
  totalCompletedOnTime: number
  dailyLoad: Record<string, number>
}
