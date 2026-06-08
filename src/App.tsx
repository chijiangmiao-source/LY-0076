import { useState } from 'preact/hooks'
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
  } = useOrders()

  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)

  const handleAddClick = () => {
    setEditingOrder(null)
    setShowFormDialog(true)
  }

  const handleEdit = (order: Order) => {
    setDetailOrder(order)
    setEditingOrder(order)
    setShowDetailDrawer(false)
    setShowFormDialog(true)
  }

  const handleViewDetail = (order: Order) => {
    setDetailOrder(order)
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
      updateOrder(editingOrder.id, data)
    } else {
      if (data.status === 'completed' || data.status === 'cancelled') {
        alert('新增订单不能直接标记为已完成或已取消')
        return
      }
      addOrder(data)
    }
    setEditingOrder(null)
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
          <StatsOverview orders={orders} />
        </section>

        <section className="orders-section">
          <div className="section-header">
            <h2 className="section-title">订单管理</h2>
          </div>
          <OrderList
            orders={orders}
            onViewDetail={handleViewDetail}
            onEdit={handleEdit}
            onDelete={deleteOrder}
            onStatusChange={updateOrderStatus}
            canMarkCompleted={canMarkCompleted}
          />
        </section>
      </main>

      <OrderFormDialog
        open={showFormDialog}
        order={editingOrder}
        onClose={() => {
          setShowFormDialog(false)
          setEditingOrder(null)
        }}
        onSubmit={handleFormSubmit}
        generateOrderNo={generateOrderNo}
        isOrderNoExists={isOrderNoExists}
      />

      <OrderDetailDrawer
        open={showDetailDrawer}
        order={detailOrder}
        onClose={() => {
          setShowDetailDrawer(false)
          setDetailOrder(null)
        }}
        onEdit={handleEdit}
        onAddStep={(step) => detailOrder && addStep(detailOrder.id, step)}
        onUpdateStep={(stepId, data) => detailOrder && updateStep(detailOrder.id, stepId, data)}
        onDeleteStep={(stepId) => detailOrder && deleteStep(detailOrder.id, stepId)}
        onToggleStepComplete={(stepId) => detailOrder && toggleStepComplete(detailOrder.id, stepId)}
      />
    </div>
  )
}
