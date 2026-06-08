import { getTodayStr } from './dateUtils'
import { isOrderNoExists } from '../storage'

export interface ValidationErrors {
  orderNo?: string
  customerName?: string
  companyName?: string
  orderDate?: string
  expectedDate?: string
  general?: string
}

function isValidName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (/^\d+$/.test(trimmed)) return false
  if (/^[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?~`]+$/.test(trimmed)) return false
  if (/[\uFFFD\uFFFE\uFFFF]/.test(trimmed)) return false
  const hasValidChar = /[\u4e00-\u9fa5a-zA-Z]/.test(trimmed)
  return hasValidChar
}

export function validateOrder(
  data: {
    orderNo: string
    customerName: string
    companyName: string
    orderDate: string
    expectedDate: string
  },
  excludeId?: string
): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!data.orderNo.trim()) {
    errors.orderNo = '订单编号不能为空'
  } else if (isOrderNoExists(data.orderNo.trim(), excludeId)) {
    errors.orderNo = '订单编号已存在'
  }

  if (!data.customerName.trim()) {
    errors.customerName = '客户姓名不能为空'
  } else if (!isValidName(data.customerName)) {
    errors.customerName = '客户姓名格式不正确，请输入有效的中文或英文姓名'
  }

  if (!data.companyName.trim()) {
    errors.companyName = '公司名称不能为空'
  } else if (!isValidName(data.companyName)) {
    errors.companyName = '公司名称格式不正确，请输入有效的公司名称'
  }

  if (!data.orderDate) {
    errors.orderDate = '请选择下单日期'
  } else {
    const today = getTodayStr()
    if (data.orderDate > today) {
      errors.orderDate = '下单日期不能晚于当前日期'
    }
  }

  if (!data.expectedDate) {
    errors.expectedDate = '请选择预计交付日期'
  } else if (data.orderDate && data.expectedDate < data.orderDate) {
    errors.expectedDate = '预计交付日期不能早于下单日期'
  }

  return errors
}
