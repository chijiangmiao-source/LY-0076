import { useCallback } from 'preact/hooks'
import { Order, ProofVersion, ConfirmationResult } from '../types'
import { generateId } from '../storage'
import { generateVersionNo } from '../utils/orderUtils'
import { getTodayStr } from '../utils/dateUtils'
import { SetOrdersFn } from './useOrderStore'

export interface UseOrderVersionsReturn {
  addVersion: (orderId: string, versionData: Omit<ProofVersion, 'id' | 'versionNo' | 'submissionTime'>) => void
  updateVersion: (orderId: string, versionId: string, data: Partial<ProofVersion>) => void
  deleteVersion: (orderId: string, versionId: string) => void
  confirmVersion: (orderId: string, versionId: string, result: ConfirmationResult, feedback?: string, confirmer?: string) => void
}

export function useOrderVersions(setOrders: SetOrdersFn, orders: Order[]): UseOrderVersionsReturn {
  const addVersion = useCallback((orderId: string, versionData: Omit<ProofVersion, 'id' | 'versionNo' | 'submissionTime'>) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const versionNo = generateVersionNo(o.versions || [])
        const newVersion: ProofVersion = {
          ...versionData,
          id: generateId(),
          versionNo,
          submissionTime: new Date().toISOString()
        }
        return {
          ...o,
          versions: [...(o.versions || []), newVersion],
          currentVersionNo: versionNo,
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  const updateVersion = useCallback((orderId: string, versionId: string, data: Partial<ProofVersion>) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          versions: (o.versions || []).map(v => v.id === versionId ? { ...v, ...data } : v),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  const deleteVersion = useCallback((orderId: string, versionId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          versions: (o.versions || []).filter(v => v.id !== versionId),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  const confirmVersion = useCallback((orderId: string, versionId: string, result: ConfirmationResult, feedback?: string, confirmer?: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updatedVersions = (o.versions || []).map(v => {
          if (v.id === versionId) {
            return {
              ...v,
              confirmationResult: result,
              confirmationTime: new Date().toISOString(),
              feedback,
              confirmer
            }
          }
          return v
        })

        let updatedStatus = o.status
        let updatedSteps = o.steps
        let updatedRevisionCount = o.revisionCount

        if (result === 'needs_revision' || result === 'rejected') {
          updatedStatus = 'proofing'
          updatedRevisionCount = o.revisionCount + 1
          updatedSteps = o.steps.map(s => {
            if (s.name === '客户确认' || s.name.includes('客户') || s.name.includes('确认')) {
              return { ...s, completed: false, completedDate: undefined }
            }
            return s
          })
          if (!updatedSteps.some(s => s.name === '客户确认')) {
            updatedSteps = [
              ...updatedSteps,
              {
                id: generateId(),
                name: '客户确认（返修）',
                assignee: '',
                plannedDate: getTodayStr(),
                completed: false,
                remark: `第 ${updatedRevisionCount} 次返修，需客户重新确认`
              }
            ]
          }
        } else if (result === 'approved') {
          if (o.status === 'proofing') {
            const allStepsCompleted = o.steps.every(s => s.completed)
            if (allStepsCompleted) {
              updatedStatus = 'pending_print'
            }
          }
        }

        return {
          ...o,
          versions: updatedVersions,
          status: updatedStatus,
          steps: updatedSteps,
          revisionCount: updatedRevisionCount,
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders, orders])

  return {
    addVersion,
    updateVersion,
    deleteVersion,
    confirmVersion
  }
}
