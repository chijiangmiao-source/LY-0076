import { useState, useMemo } from 'preact/hooks'
import { Order, WarningInfo, ORDER_STATUS_MAP, WARNING_LEVEL_MAP, CalendarTask, ScheduleGroup, ScheduleGroupKey } from '../types'

interface ProductionCalendarProps {
  orders: Order[]
  warningMap: Record<string, WarningInfo>
  getScheduleGroups: (orders: Order[]) => ScheduleGroup[]
  getCalendarTasks: (orders: Order[], startDate: string, endDate: string) => CalendarTask[]
  setScheduleDate: (orderId: string, scheduleDate: string | undefined) => void
  batchScheduleOrders: (orderIds: string[], scheduleDate: string) => void
  batchPostponeOrders: (orderIds: string[], days: number) => void
  onViewDetail: (order: Order) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const TASK_TYPE_CONFIG: Record<CalendarTask['type'], { label: string; color: string; bgColor: string }> = {
  schedule: { label: '排产', color: '#2563eb', bgColor: '#dbeafe' },
  step_due: { label: '步骤', color: '#7c3aed', bgColor: '#ede9fe' },
  version_submit: { label: '版本', color: '#d97706', bgColor: '#fef3c7' },
  delivery: { label: '交付', color: '#059669', bgColor: '#d1fae5' }
}

const GROUP_KEY_LABEL: Record<ScheduleGroupKey, string> = {
  status: '按状态',
  urgent: '加急标记',
  overdue_risk: '逾期风险',
  pending_confirm: '待回稿确认',
  revision_count: '返修次数'
}

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = new Date(firstDay)
  startDay.setDate(startDay.getDate() - firstDay.getDay())
  const days: Date[] = []
  while (days.length < 42) {
    days.push(new Date(startDay))
    startDay.setDate(startDay.getDate() + 1)
    if (days.length >= 35 && startDay > lastDay && startDay.getDay() === 0) break
  }
  return days
}

export function ProductionCalendar({
  orders,
  warningMap,
  getScheduleGroups,
  getCalendarTasks,
  setScheduleDate,
  batchScheduleOrders,
  batchPostponeOrders,
  onViewDetail
}: ProductionCalendarProps) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [batchScheduleDate, setBatchScheduleDate] = useState('')
  const [postponeDays, setPostponeDays] = useState(1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null)

  const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth])

  const calendarStart = monthDays[0].toISOString().split('T')[0]
  const calendarEnd = monthDays[monthDays.length - 1].toISOString().split('T')[0]
  const calendarTasks = useMemo(
    () => getCalendarTasks(orders, calendarStart, calendarEnd),
    [getCalendarTasks, orders, calendarStart, calendarEnd]
  )

  const scheduleGroups = useMemo(() => getScheduleGroups(orders), [getScheduleGroups, orders])

  const unscheduledOrders = useMemo(
    () => orders.filter(o =>
      !o.scheduleDate && o.status !== 'completed' && o.status !== 'cancelled'
    ),
    [orders]
  )

  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {}
    calendarTasks.forEach(task => {
      if (!map[task.date]) map[task.date] = []
      map[task.date].push(task)
    })
    return map
  }, [calendarTasks])

  const ordersByScheduleDate = useMemo(() => {
    const map: Record<string, Order[]> = {}
    orders.forEach(order => {
      if (order.scheduleDate && order.status !== 'completed' && order.status !== 'cancelled') {
        if (!map[order.scheduleDate]) map[order.scheduleDate] = []
        map[order.scheduleDate].push(order)
      }
    })
    return map
  }, [orders])

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
      next.delete(orderId)
      } else {
      next.add(orderId)
      }
      return next
    })
  }

  const selectAllOrders = () => {
    if (selectedOrderIds.size === unscheduledOrders.length) {
      setSelectedOrderIds(new Set())
    } else {
      setSelectedOrderIds(new Set(unscheduledOrders.map(o => o.id)))
    }
  }

  const handleBatchSchedule = () => {
    if (selectedOrderIds.size === 0) {
      alert('请先选择要排产的订单')
      return
    }
    if (!batchScheduleDate) {
      alert('请选择排产开始日期')
      return
    }
    batchScheduleOrders(Array.from(selectedOrderIds), batchScheduleDate)
    setSelectedOrderIds(new Set())
    setBatchScheduleDate('')
  }

  const handleBatchPostpone = () => {
    if (selectedOrderIds.size === 0) {
      alert('请先选择要顺延的订单')
      return
    }
    batchPostponeOrders(Array.from(selectedOrderIds), postponeDays)
    setSelectedOrderIds(new Set())
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
  }

  const handleDropOnDate = (dateStr: string) => {
    if (draggedOrderId) {
      setScheduleDate(draggedOrderId, dateStr)
      setDraggedOrderId(null)
      setSelectedDate(dateStr)
    }
  }

  const handleDragStart = (orderId: string) => {
    setDraggedOrderId(orderId)
  }

  const todayStr = today.toISOString().split('T')[0]

  return (
    <div className="production-calendar">
      <div className="calendar-layout">
        <div className="calendar-sidebar">
          <div className="sidebar-section">
          <div className="sidebar-title">待排产订单</div>
          <div className="sidebar-actions">
            <button
              className="btn-secondary btn-sm"
              onClick={selectAllOrders}
            >
              {selectedOrderIds.size === unscheduledOrders.length && unscheduledOrders.length > 0 ? '取消全选' : '全选'}
            </button>
            <span className="selected-count">已选: {selectedOrderIds.size}</span>
          </div>
          {unscheduledOrders.length === 0 ? (
            <div className="empty-sidebar">暂无待排产订单</div>
          ) : (
            <div className="unscheduled-list">
              {unscheduledOrders.map(order => {
                const warning = warningMap[order.id]
                return (
                  <div
                  key={order.id}
                  className={`unscheduled-item ${selectedOrderIds.has(order.id) ? 'selected' : ''} ${order.isUrgent ? 'urgent' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(order.id)}
                  onClick={() => toggleOrderSelection(order.id)}
                  style={{
                    borderLeft: warning && warning.level !== 'normal'
                      ? `3px solid ${WARNING_LEVEL_MAP[warning.level].color}`
                      : undefined
                  }}
                >
                  <div className="unscheduled-header">
                    <span className="order-no-text">{order.orderNo}</span>
                    {order.isUrgent && <span className="urgent-badge">加急</span>}
                  </div>
                  <div className="unscheduled-customer">{order.customerName} - {order.companyName}</div>
                  <div className="unscheduled-meta">
                    <span
                      className="status-badge"
                      style={{
                        color: ORDER_STATUS_MAP[order.status].color,
                        backgroundColor: ORDER_STATUS_MAP[order.status].bgColor
                      }}
                    >
                      {ORDER_STATUS_MAP[order.status].label}
                    </span>
                    <span className="delivery-date">交付: {order.expectedDate}</span>
                  </div>
                  {order.revisionCount > 0 && (
                    <div className="unscheduled-revision">返修: {order.revisionCount}次</div>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>

          <div className="sidebar-section">
            <div className="sidebar-title">批量操作</div>
            <div className="batch-form">
              <div className="form-group">
                <label className="form-label">排产开始日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={batchScheduleDate}
                  onInput={e => setBatchScheduleDate((e.target as HTMLInputElement).value)}
                />
              </div>
              <button className="btn-primary btn-sm" onClick={handleBatchSchedule}>
                批量排产
              </button>
              <div className="batch-divider"></div>
              <div className="form-group">
                <label className="form-label">顺延天数</label>
                <select
                  className="form-input"
                  value={postponeDays}
                  onChange={e => setPostponeDays(parseInt(e.currentTarget.value))}
                >
                  <option value={1}>1 天</option>
                  <option value={2}>2 天</option>
                  <option value={3}>3 天</option>
                  <option value={5}>5 天</option>
                  <option value={7}>7 天</option>
                </select>
              </div>
              <button className="btn-secondary btn-sm" onClick={handleBatchPostpone}>
                批量顺延
              </button>
            </div>
          </div>

          {scheduleGroups.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-title">分组排产</div>
              <div className="groups-list">
                {scheduleGroups.map((group, idx) => (
                <div key={`${group.key}-${idx}`} className="group-item">
                  <div className="group-header">
                    <span className="group-label">
                      {GROUP_KEY_LABEL[group.key]}
                    </span>
                    <span className="group-count">{group.orders.length}</span>
                  </div>
                  <div className="group-orders">
                    {group.orders.slice(0, 3).map(order => (
                      <div
                        key={order.id}
                        className="group-order"
                        onClick={() => onViewDetail(order)}
                      >
                        <span className="group-order-no">{order.orderNo}</span>
                        <span className="group-order-customer">{order.customerName}</span>
                      </div>
                    ))}
                    {group.orders.length > 3 && (
                      <div className="group-more">+{group.orders.length - 3} 更多</div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <div className="sidebar-title">图例</div>
            <div className="legend-list">
              {Object.entries(TASK_TYPE_CONFIG).map(([type, config]) => (
                <div key={type} className="legend-item">
                  <span
                    className="legend-dot"
                    style={{
                      backgroundColor: config.bgColor,
                      borderLeft: `3px solid ${config.color}`
                    }}
                  />
                  <span className="legend-label">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="calendar-main">
          <div className="calendar-header">
            <div className="calendar-nav">
              <button className="btn-secondary btn-sm" onClick={handlePrevMonth}>
                ‹ 上月
              </button>
              <span className="calendar-title">
                {currentYear}年{currentMonth + 1}月
              </span>
              <button className="btn-secondary btn-sm" onClick={handleNextMonth}>
                下月 ›
              </button>
              <button className="btn-secondary btn-sm" onClick={handleToday}>
                今天
              </button>
            </div>
            {selectedDate && (
              <div className="selected-date-info">
                选中日期: {selectedDate}
              </div>
            )}
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map(day => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {monthDays.map((date, idx) => {
              const dateStr = date.toISOString().split('T')[0]
              const isCurrentMonth = date.getMonth() === currentMonth
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const dayTasks = tasksByDate[dateStr] || []
              const dayOrders = ordersByScheduleDate[dateStr] || []
              return (
                <div
                  key={idx}
                  className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(dateStr)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDropOnDate(dateStr)}
                >
                  <div className="day-number">{date.getDate()}</div>
                  {dayOrders.length > 0 && (
                    <div className="day-orders">
                      {dayOrders.slice(0, 2).map(order => (
                        <div
                          key={order.id}
                          className={`day-order ${order.isUrgent ? 'urgent' : ''}`}
                          draggable
                          onDragStart={e => {
                            e.stopPropagation()
                            handleDragStart(order.id)
                          }}
                          onClick={e => {
                            e.stopPropagation()
                            onViewDetail(order)
                          }}
                          title={`${order.orderNo} - ${order.customerName}`}
                          style={{
                            borderLeft: warningMap[order.id] && warningMap[order.id].level !== 'normal'
                              ? `2px solid ${WARNING_LEVEL_MAP[warningMap[order.id].level].color}`
                              : undefined
                          }}
                        >
                          <span className="day-order-no">{order.orderNo}</span>
                        </div>
                      ))}
                      {dayOrders.length > 2 && (
                        <div className="day-more">+{dayOrders.length - 2}</div>
                      )}
                    </div>
                  )}
                  {dayTasks.length > 0 && (
                    <div className="day-tasks">
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className="day-task"
                          style={{
                            backgroundColor: TASK_TYPE_CONFIG[task.type].bgColor,
                            borderLeft: `2px solid ${TASK_TYPE_CONFIG[task.type].color}`,
                            color: TASK_TYPE_CONFIG[task.type].color
                          }}
                          title={task.title}
                        >
                          {task.title.length > 12 ? task.title.substring(0, 12) + '...' : task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="day-more-tasks">+{dayTasks.length - 2} 更多</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
