# Fire & Smoke Monitoring Dashboard

Dashboard lokal untuk memantau deteksi api/asap dengan backend FastAPI dan frontend React + Vite. Backend menyiarkan hasil inferensi melalui WebSocket ke UI yang menampilkan grid kamera, log event, dan statistik sederhana.

## Arsitektur singkat
- **Backend**: FastAPI + Uvicorn dengan endpoint REST (`/api/health`, `/api/cameras`) dan WebSocket `/ws/detections`.
- **Background tasks**: `CameraManager` membuat loop per kamera berdasarkan `backend/config/cameras.json` dan memanggil `InferenceService` untuk menghasilkan deteksi (saat ini mock).
- **Frontend**: React + Vite (TypeScript) yang berlangganan WebSocket dan merender tile kamera, log event, serta statistik sesi.

## Prasyarat
- Python 3.10+
- Node.js 18+ dan npm
- (Opsional) Docker + Docker Compose

## Konfigurasi kamera
Edit `backend/config/cameras.json` untuk menambah atau mengubah sumber kamera. Setiap entri membutuhkan `camera_id`, `name`, dan salah satu `rtsp_url` atau `file_path`.

```json
[
  {"camera_id": "cam_1", "name": "Loading Dock", "rtsp_url": "rtsp://example.com/cam1"},
  {"camera_id": "cam_2", "name": "Warehouse", "rtsp_url": "rtsp://example.com/cam2"},
  {"camera_id": "cam_3", "name": "Office", "file_path": "videos/office.mp4"},
  {"camera_id": "cam_4", "name": "Outdoor", "file_path": "videos/outdoor.mp4"}
]
```

## Jalankan lokal tanpa Docker
1. **Backend**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Endpoint yang tersedia:
   - `GET http://localhost:8000/api/health`
   - `GET http://localhost:8000/api/cameras`
   - WebSocket: `ws://localhost:8000/ws/detections`

2. **Frontend** (di terminal terpisah)
   ```bash
   cd frontend
   npm install
   npm run dev -- --host --port 5173
   ```
   Buka `http://localhost:5173` di browser. Frontend akan terhubung ke backend menggunakan URL default `http://localhost:8000` (lihat `frontend/src/context/WebSocketProvider.tsx` bila perlu mengubah).

## Jalankan dengan Docker Compose
```bash
docker compose up
```
- Backend tersedia di `http://localhost:8000` (container otomatis menjalankan `pip install -r requirements.txt` sebelum `uvicorn`).
- Frontend tersedia di `http://localhost:5173` (container otomatis menjalankan `npm install` dan `npm run dev`).

## Integrasi model YOLO
- Ganti logika mock pada `InferenceService.run_inference` (`backend/app/services/inference.py`) dengan pemanggilan model YOLO Anda. Fungsi tersebut menerima `camera_id` dan harus mengembalikan `DetectionMessage` berisi daftar `Detection`.
- Jika memakai skrip eksternal, panggil dari fungsi tersebut atau jadikan service lain sesuai kebutuhan.

## Tips tambahan
- Ubah interval inferensi via env var `FIRE_SMOKE_INFERENCE_INTERVAL_SECONDS` bila ingin sampling lebih cepat/lambat.
- Atur nama aplikasi atau versi melalui env var prefiks `FIRE_SMOKE_` (lihat `backend/app/config.py`).
