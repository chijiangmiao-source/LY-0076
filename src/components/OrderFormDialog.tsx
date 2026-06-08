import * as Dialog from '@radix-ui/react-dialog'
import { Order, OrderStatus, WarningInfo } from '../types'
import { OrderForm } from './OrderForm'

interface OrderFormDialogProps {
  open: boolean
  order?: Order | null
  warning?: WarningInfo
  onClose: () => void
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
  generateOrderNo: () => string
  isOrderNoExists: (orderNo: string, excludeId?: string) => boolean
}

export function OrderFormDialog({
  open,
  order,
  warning,
  onClose,
  onSubmit,
  generateOrderNo,
  isOrderNoExists
}: OrderFormDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">
              {order ? '编辑订单' : '新增订单'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="dialog-close-btn" aria-label="关闭">×</button>
            </Dialog.Close>
          </div>
          <div className="dialog-body">
            <OrderForm
              order={order || undefined}
              warning={warning}
              onSubmit={(data) => {
                onSubmit(data)
                onClose()
              }}
              onCancel={onClose}
              generateOrderNo={generateOrderNo}
              isOrderNoExists={isOrderNoExists}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
