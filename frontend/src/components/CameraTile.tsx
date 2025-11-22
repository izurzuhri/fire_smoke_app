import React from 'react'
import { Detection, CameraInfo } from '../types'

interface Props {
  camera: CameraInfo
  detections: Detection[]
}

const CameraTile: React.FC<Props> = ({ camera, detections }) => {
  return (
    <div className="camera-tile">
      <div className="camera-header">
        <div>
          <div className="camera-name">{camera.name}</div>
          <div className="camera-id">{camera.camera_id}</div>
        </div>
      </div>
      <div className="video-placeholder">
        Video feed placeholder
      </div>
      <div className="detection-list">
        {detections.length === 0 ? (
          <div className="detection-empty">No detections</div>
        ) : (
          detections.map((detection, idx) => (
            <div className={`badge badge-${detection.label}`} key={`${detection.label}-${idx}`}>
              {detection.label} · {(detection.confidence * 100).toFixed(1)}%
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CameraTile
