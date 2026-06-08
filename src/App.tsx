import { useState, useMemo } from 'preact/hooks'
import { useOrders } from './hooks/useOrders'
import { Order, OrderStatus } from './types'
import { StatsOverview } from './components/StatsOverview'
import { OrderList } from './components/OrderList'
import { OrderFormDialog } from './components/OrderFormDialog'
import { OrderDetailDrawer } from './components/OrderDetailDrawer'
import './styles.css'

export function App() {
  const {
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
  } = useOrders()

  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)

  const editingOrder = useMemo(
    () => editingOrderId ? orders.find(o => o.id === editingOrderId) || null : null,
    [editingOrderId, orders]
  )

  const detailOrder = useMemo(
    () => detailOrderId ? orders.find(o => o.id === detailOrderId) || null : null,
    [detailOrderId, orders]
  )

  const handleAddClick = () => {
    setEditingOrderId(null)
    setShowFormDialog(true)
  }

  const handleEdit = (order: Order) => {
    setEditingOrderId(order.id)
    setShowDetailDrawer(false)
    setShowFormDialog(true)
  }

  const handleViewDetail = (order: Order) => {
    setDetailOrderId(order.id)
    setShowDetailDrawer(true)
  }

  const handleFormSubmit = (data: {
    orderNo: string
    customerName: string
    companyName: string
    cardSpec: string
    orderDate: string
    expectedDate: string
    status: OrderStatus
    isUrgent: boolean
  }) => {
    if (editingOrder) {
      if (
        editingOrder.status !== 'completed' &&
        editingOrder.status !== 'cancelled' &&
        (data.status === 'completed' || data.status === 'cancelled')
      ) {
        alert('编辑订单时不能直接标记为已完成或已取消，请通过订单列表中的状态流转功能操作')
        return
      }
      const editingWarning = warningMap[editingOrder.id]
      if (
        editingWarning?.level === 'overdue' &&
        editingOrder.status !== 'completed' &&
        editingOrder.status !== 'cancelled' &&
        data.status !== editingOrder.status
      ) {
        alert('该订单已逾期，状态不可在编辑表单中修改，请通过订单列表状态流转功能处理')
        return
      }
      updateOrder(editingOrder.id, data)
    } else {
      if (data.status === 'completed' || data.status === 'cancelled') {
        alert('新增订单不能直接标记为已完成或已取消')
        return
      }
      addOrder(data)
    }
    setEditingOrderId(null)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🖨️</span>
            <div>
              <h1 className="app-title">名片打样排版看板</h1>
              <p className="app-subtitle">Business Card Proofing Dashboard</p>
            </div>
          </div>
          <button className="btn-primary" onClick={handleAddClick}>
            + 新增订单
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="stats-section">
          <StatsOverview orders={orders} warningMap={warningMap} />
        </section>

        <section className="orders-section">
          <div className="section-header">
            <h2 className="section-title">订单管理</h2>
          </div>
          <OrderList
            orders={orders}
            warningMap={warningMap}
            onViewDetail={handleViewDetail}
            onEdit={handleEdit}
            onDelete={deleteOrder}
            onStatusChange={updateOrderStatus}
            canMarkCompleted={canMarkCompleted}
            canTransitionTo={canTransitionTo}
            getSortedOrders={getSortedOrders}
            filterByWarningLevel={filterByWarningLevel}
          />
        </section>
      </main>

      <OrderFormDialog
        open={showFormDialog}
        order={editingOrder}
        warning={editingOrder ? warningMap[editingOrder.id] : undefined}
        onClose={() => {
          setShowFormDialog(false)
          setEditingOrderId(null)
        }}
        onSubmit={handleFormSubmit}
        generateOrderNo={generateOrderNo}
        isOrderNoExists={isOrderNoExists}
      />

      <OrderDetailDrawer
        open={showDetailDrawer}
        order={detailOrder}
        warning={detailOrder ? warningMap[detailOrder.id] : undefined}
        onClose={() => {
          setShowDetailDrawer(false)
          setDetailOrderId(null)
        }}
        onEdit={handleEdit}
        onAddStep={(step) => detailOrder && addStep(detailOrder.id, step)}
        onUpdateStep={(stepId, data) => detailOrder && updateStep(detailOrder.id, stepId, data)}
        onDeleteStep={(stepId) => detailOrder && deleteStep(detailOrder.id, stepId)}
        onToggleStepComplete={(stepId) => detailOrder && toggleStepComplete(detailOrder.id, stepId)}
        onUpdateManualPriority={updateManualPriority}
      />
    </div>
  )
}
