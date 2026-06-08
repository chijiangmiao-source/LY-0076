import * as Dialog from '@radix-ui/react-dialog'
import { Order, ORDER_STATUS_MAP } from '../types'
import { ProofSteps } from './ProofSteps'

interface OrderDetailDrawerProps {
  open: boolean
  order: Order | null
  onClose: () => void
  onEdit: (order: Order) => void
  onAddStep: (step: any) => void
  onUpdateStep: (stepId: string, data: any) => void
  onDeleteStep: (stepId: string) => void
  onToggleStepComplete: (stepId: string) => void
}

export function OrderDetailDrawer({
  open,
  order,
  onClose,
  onEdit,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onToggleStepComplete
}: OrderDetailDrawerProps) {
  if (!order) return null

  const statusInfo = ORDER_STATUS_MAP[order.status]
  const isEditable = order.status !== 'completed' && order.status !== 'cancelled'

  return (
    <Dialog.Root open={open} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer-content">
          <div className="drawer-header">
            <div className="drawer-title-group">
              <Dialog.Title className="drawer-title">订单详情</Dialog.Title>
              <div className="drawer-subtitle">
                <span className="order-no-text">{order.orderNo}</span>
                {order.isUrgent && <span className="urgent-badge">加急</span>}
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="drawer-close-btn" aria-label="关闭">×</button>
            </Dialog.Close>
          </div>

          <div className="drawer-body">
            <div className="detail-section">
              <h3 className="section-title">基本信息</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">订单状态</span>
                  <span
                    className="status-badge"
                    style={{ color: statusInfo.color, backgroundColor: statusInfo.bgColor }}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">客户姓名</span>
                  <span className="detail-value">{order.customerName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">公司名称</span>
                  <span className="detail-value">{order.companyName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">名片规格</span>
                  <span className="detail-value">{order.cardSpec}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">下单日期</span>
                  <span className="detail-value">{order.orderDate}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">预计交付</span>
                  <span className="detail-value">{order.expectedDate}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">创建时间</span>
                  <span className="detail-value">{new Date(order.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">更新时间</span>
                  <span className="detail-value">{new Date(order.updatedAt).toLocaleString('zh-CN')}</span>
                </div>
              </div>
              {isEditable && (
                <button
                  className="btn-primary btn-sm"
                  style={{ marginTop: '12px' }}
                  onClick={() => onEdit(order)}
                >
                  编辑订单
                </button>
              )}
            </div>

            <div className="detail-section">
              <ProofSteps
                orderId={order.id}
                steps={order.steps}
                disabled={!isEditable}
                onAdd={onAddStep}
                onUpdate={onUpdateStep}
                onDelete={onDeleteStep}
                onToggleComplete={onToggleStepComplete}
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
