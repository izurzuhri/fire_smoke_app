import React, { useEffect, useMemo, useState } from 'react'
import CameraGrid from './components/CameraGrid'
import EventLog from './components/EventLog'
import StatsPanel from './components/StatsPanel'
import { WebSocketProvider, useDetections } from './context/WebSocketProvider'
import { CameraInfo, DetectionMessage } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const Dashboard: React.FC = () => {
  const [cameras, setCameras] = useState<CameraInfo[]>([])
  const detections = useDetections()

  useEffect(() => {
    fetch(`${API_URL}/cameras`)
      .then((res) => res.json())
      .then((data: CameraInfo[]) => setCameras(data))
      .catch(() => setCameras([]))
  }, [])

  const latestByCamera = useMemo(() => {
    const map: Record<string, DetectionMessage | undefined> = {}
    detections.forEach((detection) => {
      if (!map[detection.camera_id]) {
        map[detection.camera_id] = detection
      }
    })
    return map
  }, [detections])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Fire & Smoke Dashboard</h1>
          <p>Real-time YOLO monitoring scaffold</p>
        </div>
        <div className="pill">Backend: {API_URL}</div>
      </header>
      <section>
        <CameraGrid cameras={cameras} latestByCamera={latestByCamera} />
      </section>
      <section className="panel-row">
        <EventLog events={detections} />
        <StatsPanel events={detections} />
      </section>
    </div>
  )
}

const App: React.FC = () => (
  <WebSocketProvider>
    <Dashboard />
  </WebSocketProvider>
)

export default App
