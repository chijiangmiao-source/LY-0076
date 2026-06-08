import { Order, ORDER_STATUS_MAP, OrderStatus, WarningInfo } from '../types'
import { Bar } from '@visx/shape'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale'
import { Text } from '@visx/text'

interface StatsOverviewProps {
  orders: Order[]
  warningMap: Record<string, WarningInfo>
}

interface StatusData {
  status: OrderStatus
  label: string
  count: number
  color: string
}

export function StatsOverview({ orders, warningMap }: StatsOverviewProps) {
  const statuses: OrderStatus[] = ['pending_layout', 'proofing', 'pending_print', 'completed', 'cancelled']

  const data: StatusData[] = statuses.map(status => ({
    status,
    label: ORDER_STATUS_MAP[status].label,
    count: orders.filter(o => o.status === status).length,
    color: ORDER_STATUS_MAP[status].color
  }))

  const totalOrders = orders.length
  const urgentCount = orders.filter(o => o.isUrgent).length
  const completedCount = orders.filter(o => o.status === 'completed').length
  const completionRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 0

  const overdueCount = orders.filter(o => {
    const w = warningMap[o.id]
    return w && w.level === 'overdue'
  }).length

  const warningUrgentCount = orders.filter(o => {
    const w = warningMap[o.id]
    return w && w.level === 'urgent'
  }).length

  const width = 600
  const height = 200
  const margin = { top: 20, right: 20, bottom: 40, left: 40 }

  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  const xScale = scaleBand<string>({
    domain: data.map(d => d.label),
    range: [0, xMax],
    padding: 0.4
  })

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const yScale = scaleLinear<number>({
    domain: [0, maxCount],
    range: [yMax, 0],
    nice: true
  })

  const colorScale = scaleOrdinal<string, string>({
    domain: data.map(d => d.label),
    range: data.map(d => d.color)
  })

  const yTicks = yScale.ticks(Math.min(maxCount, 5)).filter(t => Number.isInteger(t))

  return (
    <div className="stats-overview">
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-label">订单总数</div>
          <div className="stat-value">{totalOrders}</div>
        </div>
        <div className="stat-card stat-urgent">
          <div className="stat-label">加急订单</div>
          <div className="stat-value">{urgentCount}</div>
        </div>
        <div className="stat-card stat-warning-urgent">
          <div className="stat-label">紧急预警</div>
          <div className="stat-value">{warningUrgentCount}</div>
        </div>
        <div className="stat-card stat-overdue">
          <div className="stat-label">已逾期</div>
          <div className="stat-value">{overdueCount}</div>
        </div>
        <div className="stat-card stat-completed">
          <div className="stat-label">已完成</div>
          <div className="stat-value">{completedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">完成率</div>
          <div className="stat-value">{completionRate}%</div>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">订单状态分布</h3>
        {data.length > 0 && (
          <svg width={width} height={height}>
            <Group left={margin.left} top={margin.top}>
              {yTicks.map(tick => (
                <g key={tick}>
                  <line
                    x1={0}
                    x2={xMax}
                    y1={yScale(tick)}
                    y2={yScale(tick)}
                    stroke="#e5e7eb"
                    strokeDasharray="3,3"
                  />
                  <Text
                    x={-10}
                    y={yScale(tick)}
                    textAnchor="end"
                    verticalAnchor="middle"
                    fontSize={12}
                    fill="#6b7280"
                  >
                    {tick}
                  </Text>
                </g>
              ))}

              {data.map(d => {
                const barWidth = xScale.bandwidth()
                const barHeight = yMax - yScale(d.count)
                return (
                  <g key={d.status}>
                    <Bar
                      x={xScale(d.label)}
                      y={yScale(d.count)}
                      width={barWidth}
                      height={barHeight}
                      fill={colorScale(d.label)}
                      rx={4}
                    />
                    <Text
                      x={(xScale(d.label) || 0) + barWidth / 2}
                      y={yScale(d.count) - 8}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill="#374151"
                    >
                      {d.count}
                    </Text>
                    <Text
                      x={(xScale(d.label) || 0) + barWidth / 2}
                      y={yMax + 20}
                      textAnchor="middle"
                      fontSize={12}
                      fill="#6b7280"
                    >
                      {d.label}
                    </Text>
                  </g>
                )
              })}
            </Group>
          </svg>
        )}
        {totalOrders === 0 && (
          <div className="empty-chart">暂无订单数据</div>
        )}
      </div>
    </div>
  )
}
