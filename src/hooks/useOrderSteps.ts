import { useCallback } from 'preact/hooks'
import { ProofStep } from '../types'
import { generateId } from '../storage'
import { getTodayStr } from '../utils/dateUtils'
import { SetOrdersFn } from './useOrderStore'

export interface UseOrderStepsReturn {
  addStep: (orderId: string, step: Omit<ProofStep, 'id'>) => void
  updateStep: (orderId: string, stepId: string, data: Partial<ProofStep>) => void
  deleteStep: (orderId: string, stepId: string) => void
  toggleStepComplete: (orderId: string, stepId: string) => void
}

export function useOrderSteps(setOrders: SetOrdersFn): UseOrderStepsReturn {
  const addStep = useCallback((orderId: string, step: Omit<ProofStep, 'id'>) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const newStep: ProofStep = { ...step, id: generateId() }
        return {
          ...o,
          steps: [...o.steps, newStep],
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  const updateStep = useCallback((orderId: string, stepId: string, data: Partial<ProofStep>) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          steps: o.steps.map(s => s.id === stepId ? { ...s, ...data } : s),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  const deleteStep = useCallback((orderId: string, stepId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          steps: o.steps.filter(s => s.id !== stepId),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  const toggleStepComplete = useCallback((orderId: string, stepId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          steps: o.steps.map(s => {
            if (s.id === stepId) {
              const completed = !s.completed
              return {
                ...s,
                completed,
                completedDate: completed ? getTodayStr() : undefined
              }
            }
            return s
          }),
          updatedAt: new Date().toISOString()
        }
      }
      return o
    }))
  }, [setOrders])

  return {
    addStep,
    updateStep,
    deleteStep,
    toggleStepComplete
  }
}
