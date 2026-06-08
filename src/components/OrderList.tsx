import { useState } from 'preact/hooks'
import { Order, ORDER_STATUS_MAP, OrderStatus, WarningLevel, WARNING_LEVEL_MAP, MANUAL_PRIORITY_MAP, WarningInfo } from '../types'

interface OrderListProps {
  orders: Order[]
  warningMap: Record<string, WarningInfo>
  onViewDetail: (order: Order) => void
  onEdit: (order: Order) => void
  onDelete: (orderId: string) => void
  onStatusChange: (orderId: string, status: OrderStatus) => void
  canMarkCompleted: (order: Order) => boolean
  canTransitionTo: (order: Order, targetStatus: OrderStatus) => { allowed: boolean; reason?: string }
  getSortedOrders: (orders: Order[]) => Order[]
  filterByWarningLevel: (orders: Order[], level: WarningLevel | 'all') => Order[]
}

export function OrderList({
  orders,
  warningMap,
  onViewDetail,
  onEdit,
  onDelete,
  onStatusChange,
  canMarkCompleted,
  canTransitionTo,
  getSortedOrders,
  filterByWarningLevel
}: OrderListProps) {
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [filterWarning, setFilterWarning] = useState<WarningLevel | 'all'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [onlyUrgent, setOnlyUrgent] = useState(false)
  const [autoSort, setAutoSort] = useState(true)

  let filteredOrders = orders.filter(order => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false
    if (onlyUrgent && !order.isUrgent) return false
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase()
      return (
        order.orderNo.toLowerCase().includes(kw) ||
        order.customerName.toLowerCase().includes(kw) ||
        order.companyName.toLowerCase().includes(kw)
      )
    }
    return true
  })

  filteredOrders = filterByWarningLevel(filteredOrders, filterWarning)

  if (autoSort) {
    filteredOrders = getSortedOrders(filteredOrders)
  }

  const completedSteps = (order: Order) => order.steps.filter(s => s.completed).length
  const totalSteps = (order: Order) => order.steps.length

  const getWarningBadgeClass = (level: WarningLevel): string => {
    if (level === 'overdue') return 'warning-badge warning-overdue'
    if (level === 'urgent') return 'warning-badge warning-urgent'
    return 'warning-badge warning-normal'
  }

  const getRowClass = (order: Order, warning?: WarningInfo): string => {
    const classes: string[] = []
    if (order.isUrgent) classes.push('urgent-row')
    if (warning?.level === 'overdue') classes.push('overdue-row')
    else if (warning?.level === 'urgent') classes.push('warning-urgent-row')
    return classes.join(' ')
  }

  return (
    <div className="order-list">
      <div className="list-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="搜索订单编号、客户、公司..."
            value={searchKeyword}
            onInput={e => setSearchKeyword((e.target as HTMLInputElement).value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.currentTarget.value as OrderStatus | 'all')}
            className="filter-select"
          >
            <option value="all">全部状态</option>
            {Object.entries(ORDER_STATUS_MAP).map(([key, val]) => (
              <option value={key} key={key}>{val.label}</option>
            ))}
          </select>
          <select
            value={filterWarning}
            onChange={e => setFilterWarning(e.currentTarget.value as WarningLevel | 'all')}
            className="filter-select"
          >
            <option value="all">全部预警</option>
            {Object.entries(WARNING_LEVEL_MAP).map(([key, val]) => (
              <option value={key} key={key}>{val.label}</option>
            ))}
          </select>
          <label className="urgent-filter">
            <input
              type="checkbox"
              checked={onlyUrgent}
              onChange={e => setOnlyUrgent((e.target as HTMLInputElement).checked)}
            />
            仅显示加急
          </label>
          <label className="urgent-filter">
            <input
              type="checkbox"
              checked={autoSort}
              onChange={e => setAutoSort((e.target as HTMLInputElement).checked)}
            />
            按优先级自动排序
          </label>
        </div>
        <div className="list-count">共 {filteredOrders.length} 条订单</div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>暂无订单数据</p>
        </div>
      ) : (
        <div className="order-table-container">
          <table className="order-table">
            <thead>
              <tr>
                <th>预警/优先级</th>
                <th>订单编号</th>
                <th>客户信息</th>
                <th>名片规格</th>
                <th>日期</th>
                <th>打样进度</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const statusInfo = ORDER_STATUS_MAP[order.status]
                const warning = warningMap[order.id]
                const done = completedSteps(order)
                const total = totalSteps(order)
                const manualPriority = order.manualPriority || 'auto'
                return (
                  <tr key={order.id} className={getRowClass(order, warning)}>
                    <td>
                      <div className="warning-cell">
                        {warning && warning.level !== 'normal' && (
                          <span
                            className={getWarningBadgeClass(warning.level)}
                            title={warning.reason}
                          >
                            {WARNING_LEVEL_MAP[warning.level].label}
                          </span>
                        )}
                        {manualPriority !== 'auto' && (
                          <span
                            className="priority-badge"
                            style={{ color: MANUAL_PRIORITY_MAP[manualPriority].color }}
                          >
                            P:{MANUAL_PRIORITY_MAP[manualPriority].label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="order-no-cell">
                        <span className="order-no">{order.orderNo}</span>
                        {order.isUrgent && <span className="urgent-badge">加急</span>}
                      </div>
                    </td>
                    <td>
                      <div className="customer-info">
                        <div className="customer-name">{order.customerName}</div>
                        <div className="company-name">{order.companyName}</div>
                      </div>
                    </td>
                    <td>{order.cardSpec}</td>
                    <td>
                      <div className="date-info">
                        <div className="date-item">下单: {order.orderDate}</div>
                        <div className="date-item">
                          交付: {order.expectedDate}
                          {warning && (
                            <span className="days-remaining" style={{ color: WARNING_LEVEL_MAP[warning.level].color }}>
                              ({warning.reason})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: total > 0 ? `${(done / total) * 100}%` : '0%'
                            }}
                          />
                        </div>
                        <span className="progress-text">{done}/{total}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ color: statusInfo.color, backgroundColor: statusInfo.bgColor }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-link" onClick={() => onViewDetail(order)}>详情</button>
                        <button
                          className="btn-link btn-secondary"
                          onClick={() => onEdit(order)}
                          disabled={order.status === 'completed' || order.status === 'cancelled'}
                        >
                          编辑
                        </button>
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <select
                            className="status-select"
                            value=""
                            onChange={e => {
                              const val = e.currentTarget.value as OrderStatus
                              if (val) {
                                if (val === 'completed' && !canMarkCompleted(order)) {
                                  alert('所有打样步骤完成后才能标记为已完成')
                                  e.currentTarget.value = ''
                                  return
                                }
                                const check = canTransitionTo(order, val)
                                if (!check.allowed) {
                                  alert(check.reason || '无法流转状态')
                                  e.currentTarget.value = ''
                                  return
                                }
                                onStatusChange(order.id, val)
                                e.currentTarget.value = ''
                              }
                            }}
                          >
                            <option value="">流转状态</option>
                            {Object.entries(ORDER_STATUS_MAP)
                              .filter(([key]) => key !== order.status)
                              .map(([key, val]) => {
                                const keyTyped = key as OrderStatus
                                const transitionCheck = canTransitionTo(order, keyTyped)
                                return (
                                  <option
                                    value={key}
                                    key={key}
                                    disabled={!transitionCheck.allowed}
                                    title={transitionCheck.reason}
                                  >
                                    {val.label}{!transitionCheck.allowed ? ' (不可用)' : ''}
                                  </option>
                                )
                              })}
                          </select>
                        )}
                        <button
                          className="btn-link btn-danger"
                          onClick={() => {
                            if (confirm('确定要删除此订单吗？')) onDelete(order.id)
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
