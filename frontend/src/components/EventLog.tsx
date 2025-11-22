import React from 'react'
import { DetectionMessage } from '../types'

interface Props {
  events: DetectionMessage[]
}

const EventLog: React.FC<Props> = ({ events }) => {
  return (
    <div className="panel">
      <div className="panel-header">Recent Events</div>
      <div className="table">
        <div className="table-head">
          <div>Time</div>
          <div>Camera</div>
          <div>Label</div>
          <div>Conf.</div>
        </div>
        <div className="table-body">
          {events.length === 0 ? (
            <div className="table-row muted">Waiting for detections...</div>
          ) : (
            events.slice(0, 50).map((event, idx) => {
              const date = new Date(event.timestamp)
              const label = event.detections[0]?.label ?? '—'
              const conf = event.detections[0]?.confidence ?? 0
              return (
                <div className="table-row" key={`${event.camera_id}-${idx}`}>
                  <div>{date.toLocaleTimeString()}</div>
                  <div>{event.camera_id}</div>
                  <div className={`badge badge-${label}`}>{label || 'none'}</div>
                  <div>{conf ? `${(conf * 100).toFixed(1)}%` : '—'}</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default EventLog
