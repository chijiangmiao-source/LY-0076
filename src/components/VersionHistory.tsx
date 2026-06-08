import { useState } from 'preact/hooks'
import { ProofVersion, UPLOAD_STATUS_MAP, CONFIRMATION_RESULT_MAP, UploadStatus, ConfirmationResult } from '../types'

interface VersionHistoryProps {
  orderId: string
  versions: ProofVersion[]
  disabled?: boolean
  onAdd: (versionData: Omit<ProofVersion, 'id' | 'versionNo' | 'submissionTime'>) => void
  onUpdate: (versionId: string, data: Partial<ProofVersion>) => void
  onDelete: (versionId: string) => void
  onConfirm: (versionId: string, result: ConfirmationResult, feedback?: string, confirmer?: string) => void
}

export function VersionHistory({
  versions,
  disabled,
  onAdd,
  onUpdate,
  onDelete,
  onConfirm
}: VersionHistoryProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [newVersion, setNewVersion] = useState({
    modificationNotes: '',
    uploadStatus: 'not_uploaded' as UploadStatus,
    confirmationResult: 'pending' as ConfirmationResult
  })
  const [editVersion, setEditVersion] = useState<Partial<ProofVersion>>({})
  const [confirmData, setConfirmData] = useState({
    result: 'approved' as ConfirmationResult,
    feedback: '',
    confirmer: ''
  })

  const handleAddSubmit = (e: Event) => {
    e.preventDefault()
    onAdd({
      modificationNotes: newVersion.modificationNotes.trim(),
      uploadStatus: newVersion.uploadStatus,
      confirmationResult: newVersion.confirmationResult
    })
    setNewVersion({
      modificationNotes: '', uploadStatus: 'not_uploaded', confirmationResult: 'pending' })
    setShowAddForm(false)
  }

  const handleEditStart = (version: ProofVersion) => {
    setEditingId(version.id)
    setEditVersion({
      modificationNotes: version.modificationNotes,
      uploadStatus: version.uploadStatus,
      confirmationResult: version.confirmationResult
    })
  }

  const handleEditSubmit = (versionId: string, e: Event) => {
    e.preventDefault()
    onUpdate(versionId, {
      modificationNotes: editVersion.modificationNotes?.trim() || '',
      uploadStatus: editVersion.uploadStatus,
      confirmationResult: editVersion.confirmationResult
    })
    setEditingId(null)
    setEditVersion({})
  }

  const handleConfirmStart = (version: ProofVersion) => {
    setConfirmingId(version.id)
    setConfirmData({
      result: version.confirmationResult,
      feedback: version.feedback || '',
      confirmer: version.confirmer || ''
    })
  }

  const handleConfirmSubmit = (versionId: string, e: Event) => {
    e.preventDefault()
    onConfirm(versionId, confirmData.result, confirmData.feedback.trim(), confirmData.confirmer.trim())
    setConfirmingId(null)
    setConfirmData({ result: 'approved', feedback: '', confirmer: '' })
  }

  const sortedVersions = [...versions].sort((a, b) =>
    new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime()
  )

  return (
    <div className="version-history">
      <div className="steps-header">
        <h3 className="steps-title">打样版本历史</h3>
        <div className="steps-progress">
          共 {versions.length} 个版本
        </div>
        {!disabled && !showAddForm && (
          <button className="btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
            + 提交新版本
          </button>
        )}
      </div>

      {versions.length > 0 && (
        <div className="versions-list">
          {sortedVersions.map((version, index) => {
            const uploadInfo = UPLOAD_STATUS_MAP[version.uploadStatus]
            const confirmInfo = CONFIRMATION_RESULT_MAP[version.confirmationResult]
            return (
              <div
                key={version.id}
                className="version-item"
              >
                {editingId === version.id ? (
                  <form className="version-edit-form" onSubmit={e => handleEditSubmit(version.id, e)}>
                    <div className="step-edit-row">
                      <textarea
                        value={editVersion.modificationNotes || ''}
                        onInput={e => setEditVersion(prev => ({ ...prev, modificationNotes: (e.target as HTMLTextAreaElement).value })}
                        className="form-input"
                        placeholder="修改说明"
                        rows={2}
                      />
                    </div>
                    <div className="step-edit-row">
                      <div className="form-group">
                        <label className="form-label">上传状态</label>
                        <select
                          value={editVersion.uploadStatus || 'not_uploaded'}
                          onChange={e => setEditVersion(prev => ({ ...prev, uploadStatus: e.currentTarget.value as UploadStatus }))}
                          className="form-input"
                        >
                          {Object.entries(UPLOAD_STATUS_MAP).map(([key, val]) => (
                            <option value={key} key={key}>{val.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">确认结果</label>
                        <select
                          value={editVersion.confirmationResult || 'pending'}
                          onChange={e => setEditVersion(prev => ({ ...prev, confirmationResult: e.currentTarget.value as ConfirmationResult }))}
                          className="form-input"
                        >
                          {Object.entries(CONFIRMATION_RESULT_MAP).map(([key, val]) => (
                            <option value={key} key={key}>{val.label}</option>
                          ))}
                        </select>
                      </div>
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
                ) : confirmingId === version.id ? (
                  <form className="version-edit-form" onSubmit={e => handleConfirmSubmit(version.id, e)}>
                    <div className="step-edit-row">
                      <div className="form-group">
                        <label className="form-label">确认结果</label>
                        <select
                          value={confirmData.result}
                          onChange={e => setConfirmData(prev => ({ ...prev, result: e.currentTarget.value as ConfirmationResult }))}
                          className="form-input"
                        >
                          {Object.entries(CONFIRMATION_RESULT_MAP).map(([key, val]) => (
                            <option value={key} key={key}>{val.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">确认人</label>
                        <input
                          type="text"
                          value={confirmData.confirmer}
                          onInput={e => setConfirmData(prev => ({ ...prev, confirmer: (e.target as HTMLInputElement).value })}
                          className="form-input"
                          placeholder="请输入确认人姓名"
                        />
                      </div>
                    </div>
                    <div className="step-edit-row">
                      <div className="form-group">
                        <label className="form-label">反馈意见</label>
                        <textarea
                          value={confirmData.feedback}
                          onInput={e => setConfirmData(prev => ({ ...prev, feedback: (e.target as HTMLTextAreaElement).value })}
                          className="form-input"
                          placeholder="请输入反馈意见（客户退回修改时必填）"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="step-actions">
                      <button
                        type="button"
                        className="btn-link btn-secondary"
                        onClick={() => setConfirmingId(null)}
                      >
                        取消
                      </button>
                      <button type="submit" className="btn-link">确认</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="step-content">
                      <span className="step-index">
                        <span className="version-no">{version.versionNo}</span>
                      </span>
                      <div className="step-details">
                        <div className="step-name">版本 {version.versionNo}</div>
                        <div className="step-meta">
                          <span>提交时间: {new Date(version.submissionTime).toLocaleString('zh-CN')}</span>
                          {version.confirmer && <span>确认人: {version.confirmer}</span>}
                          {version.confirmationTime && (
                            <span>确认时间: {new Date(version.confirmationTime).toLocaleString('zh-CN')}</span>
                          )}
                        </div>
                        {version.modificationNotes && (
                          <div className="step-remark">修改说明: {version.modificationNotes}</div>
                        )}
                        {version.feedback && (
                          <div className="version-feedback">反馈意见: {version.feedback}</div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <span
                            className="status-badge"
                            style={{ color: uploadInfo.color, backgroundColor: uploadInfo.bgColor }}
                          >
                            {uploadInfo.label}
                          </span>
                          <span
                            className="status-badge"
                            style={{ color: confirmInfo.color, backgroundColor: confirmInfo.bgColor }}
                          >
                            {confirmInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!disabled && (
                      <div className="step-actions">
                        {version.confirmationResult === 'pending' && (
                          <button
                            className="btn-link"
                            onClick={() => handleConfirmStart(version)}
                          >
                            客户确认
                          </button>
                        )}
                        <button
                          className="btn-link btn-secondary"
                          onClick={() => handleEditStart(version)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn-link btn-danger"
                          onClick={() => {
                            if (confirm('确定删除此版本记录？')) onDelete(version.id)
                          }}
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddForm && (
        <form className="add-step-form" onSubmit={handleAddSubmit}>
          <h4 className="form-subtitle">提交新版本</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">修改说明</label>
              <textarea
                value={newVersion.modificationNotes}
                onInput={e => setNewVersion(prev => ({ ...prev, modificationNotes: (e.target as HTMLTextAreaElement).value })}
                className="form-input"
                placeholder="请输入此版本的修改说明"
                rows={3}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">上传状态</label>
              <select
                value={newVersion.uploadStatus}
                onChange={e => setNewVersion(prev => ({ ...prev, uploadStatus: e.currentTarget.value as UploadStatus }))}
                className="form-input"
              >
                {Object.entries(UPLOAD_STATUS_MAP).map(([key, val]) => (
                  <option value={key} key={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">确认状态</label>
              <select
                value={newVersion.confirmationResult}
                onChange={e => setNewVersion(prev => ({ ...prev, confirmationResult: e.currentTarget.value as ConfirmationResult }))}
                className="form-input"
              >
                {Object.entries(CONFIRMATION_RESULT_MAP).map(([key, val]) => (
                  <option value={key} key={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAddForm(false)
                setNewVersion({ modificationNotes: '', uploadStatus: 'not_uploaded', confirmationResult: 'pending' })
              }}
            >
              取消
            </button>
            <button type="submit" className="btn-primary">提交</button>
          </div>
        </form>
      )}

      {versions.length === 0 && !showAddForm && (
        <div className="empty-steps">
          <p>暂无打样版本，点击"提交新版本"开始创建版本记录</p>
        </div>
      )}
    </div>
  )
}
