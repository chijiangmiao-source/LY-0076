import { useState } from 'preact/hooks'
import { ProofStep } from '../types'

interface ProofStepsProps {
  orderId: string
  steps: ProofStep[]
  disabled?: boolean
  onAdd: (step: Omit<ProofStep, 'id'>) => void
  onUpdate: (stepId: string, data: Partial<ProofStep>) => void
  onDelete: (stepId: string) => void
  onToggleComplete: (stepId: string) => void
}

const DEFAULT_STEP_NAMES = ['设计排版', '客户确认', '出菲林/CTP', '打样输出', '品质检查']

export function ProofSteps({
  steps,
  disabled,
  onAdd,
  onUpdate,
  onDelete,
  onToggleComplete
}: ProofStepsProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newStep, setNewStep] = useState({
    name: '',
    assignee: '',
    plannedDate: '',
    remark: ''
  })
  const [editStep, setEditStep] = useState<Partial<ProofStep>>({})

  const handleAddSubmit = (e: Event) => {
    e.preventDefault()
    if (!newStep.name.trim()) return
    onAdd({
      name: newStep.name.trim(),
      assignee: newStep.assignee.trim(),
      plannedDate: newStep.plannedDate,
      completed: false,
      remark: newStep.remark.trim()
    })
    setNewStep({ name: '', assignee: '', plannedDate: '', remark: '' })
    setShowAddForm(false)
  }

  const handleEditStart = (step: ProofStep) => {
    setEditingId(step.id)
    setEditStep({
      name: step.name,
      assignee: step.assignee,
      plannedDate: step.plannedDate,
      remark: step.remark
    })
  }

  const handleEditSubmit = (stepId: string, e: Event) => {
    e.preventDefault()
    if (!editStep.name?.trim()) return
    onUpdate(stepId, {
      name: editStep.name.trim(),
      assignee: editStep.assignee?.trim() || '',
      plannedDate: editStep.plannedDate || '',
      remark: editStep.remark?.trim() || ''
    })
    setEditingId(null)
    setEditStep({})
  }

  const completedCount = steps.filter(s => s.completed).length
  const totalCount = steps.length

  return (
    <div className="proof-steps">
      <div className="steps-header">
        <h3 className="steps-title">打样步骤</h3>
        <div className="steps-progress">
          进度: {completedCount}/{totalCount}
          {totalCount > 0 && (
            <span className="steps-progress-percent">
              ({Math.round((completedCount / totalCount) * 100)}%)
            </span>
          )}
        </div>
        {!disabled && !showAddForm && (
          <button className="btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
            + 添加步骤
          </button>
        )}
      </div>

      {totalCount > 0 && (
        <div className="steps-list">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`step-item ${step.completed ? 'step-completed' : ''}`}
            >
              {editingId === step.id ? (
                <form className="step-edit-form" onSubmit={e => handleEditSubmit(step.id, e)}>
                  <div className="step-edit-row">
                    <span className="step-index">{index + 1}.</span>
                    <input
                      type="text"
                      value={editStep.name || ''}
                      onInput={e => setEditStep(prev => ({ ...prev, name: (e.target as HTMLInputElement).value }))}
                      className="form-input"
                      placeholder="步骤名称"
                    />
                    <input
                      type="text"
                      value={editStep.assignee || ''}
                      onInput={e => setEditStep(prev => ({ ...prev, assignee: (e.target as HTMLInputElement).value }))}
                      className="form-input"
                      placeholder="负责人"
                    />
                    <input
                      type="date"
                      value={editStep.plannedDate || ''}
                      onChange={e => setEditStep(prev => ({ ...prev, plannedDate: e.currentTarget.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="step-edit-row">
                    <input
                      type="text"
                      value={editStep.remark || ''}
                      onInput={e => setEditStep(prev => ({ ...prev, remark: (e.target as HTMLInputElement).value }))}
                      className="form-input"
                      placeholder="备注"
                    />
                  </div>
                  <div className="step-actions">
                    <button
                      type="button"
                      className="btn-link btn-secondary"
                      onClick={() => setEditingId(null)}
                    >
                      取消
                    </button>
                    <button type="submit" className="btn-link">保存</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="step-content">
                    <label className="step-checkbox">
                      <input
                        type="checkbox"
                        checked={step.completed}
                        onChange={() => !disabled && onToggleComplete(step.id)}
                        disabled={disabled}
                      />
                      <span className="step-index">{index + 1}.</span>
                    </label>
                    <div className="step-details">
                      <div className="step-name">{step.name}</div>
                      <div className="step-meta">
                        {step.assignee && <span>负责人: {step.assignee}</span>}
                        {step.plannedDate && <span>计划: {step.plannedDate}</span>}
                        {step.completed && step.completedDate && (
                          <span className="step-completed-date">完成: {step.completedDate}</span>
                        )}
                      </div>
                      {step.remark && <div className="step-remark">备注: {step.remark}</div>}
                    </div>
                  </div>
                  {!disabled && (
                    <div className="step-actions">
                      <button
                        className="btn-link btn-secondary"
                        onClick={() => handleEditStart(step)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn-link btn-danger"
                        onClick={() => {
                          if (confirm('确定删除此步骤？')) onDelete(step.id)
                        }}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <form className="add-step-form" onSubmit={handleAddSubmit}>
          <h4 className="form-subtitle">新增打样步骤</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">步骤名称 *</label>
              <select
                value={newStep.name}
                onChange={e => setNewStep(prev => ({ ...prev, name: e.currentTarget.value }))}
                className="form-input"
              >
                <option value="">请选择或手动输入</option>
                {DEFAULT_STEP_NAMES.map(name => (
                  <option value={name} key={name}>{name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newStep.name}
                onInput={e => setNewStep(prev => ({ ...prev, name: (e.target as HTMLInputElement).value }))}
                className="form-input"
                placeholder="或手动输入步骤名称"
                style={{ marginTop: '8px' }}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">负责人</label>
              <input
                type="text"
                value={newStep.assignee}
                onInput={e => setNewStep(prev => ({ ...prev, assignee: (e.target as HTMLInputElement).value }))}
                className="form-input"
                placeholder="请输入负责人姓名"
              />
            </div>
            <div className="form-group">
              <label className="form-label">计划完成日期</label>
              <input
                type="date"
                value={newStep.plannedDate}
                onChange={e => setNewStep(prev => ({ ...prev, plannedDate: e.currentTarget.value }))}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">备注</label>
              <input
                type="text"
                value={newStep.remark}
                onInput={e => setNewStep(prev => ({ ...prev, remark: (e.target as HTMLInputElement).value }))}
                className="form-input"
                placeholder="可选备注信息"
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAddForm(false)
                setNewStep({ name: '', assignee: '', plannedDate: '', remark: '' })
              }}
            >
              取消
            </button>
            <button type="submit" className="btn-primary">添加</button>
          </div>
        </form>
      )}

      {totalCount === 0 && !showAddForm && (
        <div className="empty-steps">
          <p>暂无打样步骤，点击"添加步骤"开始创建打样流程</p>
        </div>
      )}
    </div>
  )
}
