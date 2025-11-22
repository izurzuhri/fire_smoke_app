import React, { useMemo } from 'react'
import { DetectionMessage } from '../types'

interface Props {
  events: DetectionMessage[]
}

const StatsPanel: React.FC<Props> = ({ events }) => {
  const stats = useMemo(() => {
    const totals: Record<string, number> = {}
    events.forEach((event) => {
      event.detections.forEach((det) => {
        const key = `${event.camera_id}-${det.label}`
        totals[key] = (totals[key] || 0) + 1
      })
    })
    return totals
  }, [events])

  const entries = Object.entries(stats)

  return (
    <div className="panel">
      <div className="panel-header">Session Stats</div>
      {entries.length === 0 ? (
        <div className="muted">No detections yet.</div>
      ) : (
        <div className="stats-grid">
          {entries.map(([key, count]) => {
            const [camera, label] = key.split('-')
            return (
              <div className="stat-card" key={key}>
                <div className="stat-label">{camera}</div>
                <div className="stat-value">{count}</div>
                <div className="stat-sub">{label}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StatsPanel
