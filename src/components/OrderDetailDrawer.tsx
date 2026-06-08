import * as Dialog from '@radix-ui/react-dialog'
import { Order, ORDER_STATUS_MAP, WARNING_LEVEL_MAP, MANUAL_PRIORITY_MAP, WarningInfo, ManualPriority, ProofVersion, ConfirmationResult } from '../types'
import { ProofSteps } from './ProofSteps'
import { VersionHistory } from './VersionHistory'

interface OrderDetailDrawerProps {
  open: boolean
  order: Order | null
  warning?: WarningInfo
  onClose: () => void
  onEdit: (order: Order) => void
  onAddStep: (step: any) => void
  onUpdateStep: (stepId: string, data: any) => void
  onDeleteStep: (stepId: string) => void
  onToggleStepComplete: (stepId: string) => void
  onUpdateManualPriority: (orderId: string, priority: ManualPriority) => void
  onAddVersion: (versionData: Omit<ProofVersion, 'id' | 'versionNo' | 'submissionTime'>) => void
  onUpdateVersion: (versionId: string, data: Partial<ProofVersion>) => void
  onDeleteVersion: (versionId: string) => void
  onConfirmVersion: (versionId: string, result: ConfirmationResult, feedback?: string, confirmer?: string) => void
}

export function OrderDetailDrawer({
  open,
  order,
  warning,
  onClose,
  onEdit,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onToggleStepComplete,
  onUpdateManualPriority,
  onAddVersion,
  onUpdateVersion,
  onDeleteVersion,
  onConfirmVersion
}: OrderDetailDrawerProps) {
  if (!order) return null

  const statusInfo = ORDER_STATUS_MAP[order.status]
  const isEditable = order.status !== 'completed' && order.status !== 'cancelled'
  const manualPriority = order.manualPriority || 'auto'

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
                {order.revisionCount >= 2 && <span className="revision-badge">返修x{order.revisionCount}</span>}
                {warning && warning.level !== 'normal' && (
                  <span
                    className={`warning-badge ${warning.level === 'overdue' ? 'warning-overdue' : 'warning-urgent'}`}
                  >
                    {WARNING_LEVEL_MAP[warning.level].label}
                  </span>
                )}
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="drawer-close-btn" aria-label="关闭">×</button>
            </Dialog.Close>
          </div>

          <div className="drawer-body">
            {warning && warning.level !== 'normal' && (
              <div className={`warning-alert ${warning.level === 'overdue' ? 'alert-overdue' : 'alert-urgent'}`}>
                <span className="warning-alert-icon">
                  {warning.level === 'overdue' ? '⚠️' : '⚡'}
                </span>
                <div className="warning-alert-content">
                  <div className="warning-alert-title">{WARNING_LEVEL_MAP[warning.level].label}</div>
                  <div className="warning-alert-reason">{warning.reason}</div>
                </div>
              </div>
            )}

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
                  <span className="detail-label">预警级别</span>
                  {warning && (
                    <span
                      className={`warning-badge ${warning.level === 'overdue' ? 'warning-overdue' : warning.level === 'urgent' ? 'warning-urgent' : 'warning-normal'}`}
                    >
                      {WARNING_LEVEL_MAP[warning.level].label}
                    </span>
                  )}
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
                  <span className="detail-label">
                    手动优先级
                    {isEditable && (
                      <select
                        className="priority-select-inline"
                        value={manualPriority}
                        onChange={e => onUpdateManualPriority(order.id, e.currentTarget.value as ManualPriority)}
                        style={{ marginLeft: '8px' }}
                      >
                        {Object.entries(MANUAL_PRIORITY_MAP).map(([key, val]) => (
                          <option value={key} key={key}>{val.label}</option>
                        ))}
                      </select>
                    )}
                  </span>
                  <span className="detail-value" style={{ color: MANUAL_PRIORITY_MAP[manualPriority].color }}>
                    {MANUAL_PRIORITY_MAP[manualPriority].label}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">下单日期</span>
                  <span className="detail-value">{order.orderDate}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">预计交付</span>
                  <span
                    className="detail-value"
                    style={warning ? { color: WARNING_LEVEL_MAP[warning.level].color, fontWeight: 600 } : {}}
                  >
                    {order.expectedDate}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">版本总数</span>
                  <span className="detail-value">{order.versions?.length || 0} 个</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">返修次数</span>
                  <span className="detail-value" style={{ color: order.revisionCount >= 2 ? '#dc2626' : '#374151', fontWeight: order.revisionCount >= 2 ? 600 : 400 }}>
                    {order.revisionCount} 次
                  </span>
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
              {warning && (
                <div className="warning-reason-box">
                  <span className="warning-reason-label">预警说明：</span>
                  <span className="warning-reason-text">{warning.reason}</span>
                </div>
              )}
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
              <VersionHistory
                orderId={order.id}
                versions={order.versions || []}
                disabled={!isEditable}
                onAdd={onAddVersion}
                onUpdate={onUpdateVersion}
                onDelete={onDeleteVersion}
                onConfirm={onConfirmVersion}
              />
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
