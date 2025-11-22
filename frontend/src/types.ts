export type Detection = {
  label: string
  confidence: number
  bbox: number[]
}

export type DetectionMessage = {
  camera_id: string
  timestamp: string
  detections: Detection[]
}

export type CameraInfo = {
  camera_id: string
  name: string
  rtsp_url?: string
  file_path?: string
}
