import React from 'react'
import { CameraInfo, DetectionMessage } from '../types'
import CameraTile from './CameraTile'

interface Props {
  cameras: CameraInfo[]
  latestByCamera: Record<string, DetectionMessage | undefined>
}

const CameraGrid: React.FC<Props> = ({ cameras, latestByCamera }) => {
  return (
    <div className="camera-grid">
      {cameras.map((camera) => (
        <CameraTile
          key={camera.camera_id}
          camera={camera}
          detections={latestByCamera[camera.camera_id]?.detections ?? []}
        />
      ))}
    </div>
  )
}

export default CameraGrid
