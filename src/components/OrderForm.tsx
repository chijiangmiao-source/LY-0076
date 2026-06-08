import { useState, useEffect } from 'preact/hooks'
import { Order, OrderStatus, CARD_SPEC_OPTIONS, ORDER_STATUS_MAP } from '../types'
import { ValidationErrors, validateOrder } from '../hooks/useOrders'

interface OrderFormProps {
  order?: Order
  onSubmit: (data: {
    orderNo: string
    customerName: string
    companyName: string
    cardSpec: string
    orderDate: string
    expectedDate: string
    status: OrderStatus
    isUrgent: boolean
  }) => void
  onCancel: () => void
  generateOrderNo: () => string
  isOrderNoExists: (orderNo: string, excludeId?: string) => boolean
}

export function OrderForm({
  order,
  onSubmit,
  onCancel,
  generateOrderNo,
  isOrderNoExists
}: OrderFormProps) {
  const isEdit = !!order
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    orderNo: order?.orderNo || '',
    customerName: order?.customerName || '',
    companyName: order?.companyName || '',
    cardSpec: order?.cardSpec || CARD_SPEC_OPTIONS[0],
    orderDate: order?.orderDate || today,
    expectedDate: order?.expectedDate || '',
    status: order?.status || 'pending_layout' as OrderStatus,
    isUrgent: order?.isUrgent || false
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isEdit && !formData.orderNo) {
      setFormData(prev => ({ ...prev, orderNo: generateOrderNo() }))
    }
  }, [])

  const validate = () => {
    const newErrors = validateOrder(formData, order?.id)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (touched[field]) {
      setTimeout(() => validate(), 0)
    }
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validate()
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    setTouched({
      orderNo: true,
      customerName: true,
      companyName: true,
      orderDate: true,
      expectedDate: true
    })
    if (validate()) {
      onSubmit(formData)
    }
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">订单编号 *</label>
          <div className="order-no-input-group">
            <input
              type="text"
              value={formData.orderNo}
              onInput={e => handleFieldChange('orderNo', (e.target as HTMLInputElement).value)}
              onBlur={() => handleBlur('orderNo')}
              className={`form-input ${errors.orderNo ? 'input-error' : ''}`}
              placeholder="请输入订单编号"
            />
            {!isEdit && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleFieldChange('orderNo', generateOrderNo())}
              >
                自动生成
              </button>
            )}
          </div>
          {errors.orderNo && <div className="form-error">{errors.orderNo}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">客户姓名 *</label>
          <input
            type="text"
            value={formData.customerName}
            onInput={e => handleFieldChange('customerName', (e.target as HTMLInputElement).value)}
            onBlur={() => handleBlur('customerName')}
            className={`form-input ${errors.customerName ? 'input-error' : ''}`}
            placeholder="请输入客户姓名"
          />
          {errors.customerName && <div className="form-error">{errors.customerName}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">公司名称 *</label>
          <input
            type="text"
            value={formData.companyName}
            onInput={e => handleFieldChange('companyName', (e.target as HTMLInputElement).value)}
            onBlur={() => handleBlur('companyName')}
            className={`form-input ${errors.companyName ? 'input-error' : ''}`}
            placeholder="请输入公司名称"
          />
          {errors.companyName && <div className="form-error">{errors.companyName}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">名片规格</label>
          <select
            value={formData.cardSpec}
            onChange={e => handleFieldChange('cardSpec', e.currentTarget.value)}
            className="form-input"
          >
            {CARD_SPEC_OPTIONS.map(spec => (
              <option value={spec} key={spec}>{spec}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              checked={formData.isUrgent}
              onChange={e => handleFieldChange('isUrgent', (e.target as HTMLInputElement).checked)}
            />
            加急订单
          </label>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">下单日期 *</label>
          <input
            type="date"
            value={formData.orderDate}
            max={today}
            onChange={e => handleFieldChange('orderDate', e.currentTarget.value)}
            onBlur={() => handleBlur('orderDate')}
            className={`form-input ${errors.orderDate ? 'input-error' : ''}`}
          />
          {errors.orderDate && <div className="form-error">{errors.orderDate}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">预计交付日期 *</label>
          <input
            type="date"
            value={formData.expectedDate}
            min={formData.orderDate}
            onChange={e => handleFieldChange('expectedDate', e.currentTarget.value)}
            onBlur={() => handleBlur('expectedDate')}
            className={`form-input ${errors.expectedDate ? 'input-error' : ''}`}
          />
          {errors.expectedDate && <div className="form-error">{errors.expectedDate}</div>}
        </div>
      </div>

      {isEdit && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">订单状态</label>
            <select
              value={formData.status}
              onChange={e => handleFieldChange('status', e.currentTarget.value as OrderStatus)}
              className="form-input"
            >
              {Object.entries(ORDER_STATUS_MAP).map(([key, val]) => (
                <option value={key} key={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {errors.general && <div className="form-error form-error-general">{errors.general}</div>}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>取消</button>
        <button type="submit" className="btn-primary">{isEdit ? '保存修改' : '创建订单'}</button>
      </div>
    </form>
  )
}
