"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Monitor,
  Activity,
  AlertTriangle,
  Flame,
  Eye,
  WifiOff,
  Wifi,
  Settings,
  BarChart3,
  Clock,
  Play,
  Square,
} from "lucide-react";

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [eventLog, setEventLog] = useState([]);
  const [stats, setStats] = useState({
    totalFire: 0,
    totalSmoke: 0,
    totalEvents: 0,
  });
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [ws, setWs] = useState(null);

  // Initialize dashboard data
  useEffect(() => {
    loadCameras();
    loadRecentDetections();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Load cameras from API
  const loadCameras = async () => {
    try {
      const response = await fetch("/api/cameras");
      if (!response.ok) throw new Error("Failed to fetch cameras");

      const data = await response.json();
      setCameras(
        data.cameras.map((cam) => ({
          id: cam.id,
          name: cam.name,
          status: cam.status,
          detections: [],
          recentFire: cam.recent_fire,
          recentSmoke: cam.recent_smoke,
        })),
      );
    } catch (error) {
      console.error("Error loading cameras:", error);
    }
  };

  // Load recent detections
  const loadRecentDetections = async () => {
    try {
      const response = await fetch("/api/detections?hours=24&limit=50");
      if (!response.ok) throw new Error("Failed to fetch detections");

      const data = await response.json();
      setEventLog(data.detections);

      // Calculate stats
      const fireCount = data.detections.filter(
        (d) => d.detection_type === "fire",
      ).length;
      const smokeCount = data.detections.filter(
        (d) => d.detection_type === "smoke",
      ).length;

      setStats({
        totalFire: fireCount,
        totalSmoke: smokeCount,
        totalEvents: data.detections.length,
      });
    } catch (error) {
      console.error("Error loading detections:", error);
    }
  };

  // Connect to WebSocket for real-time updates
  const connectWebSocket = useCallback(() => {
    setWsStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setWsStatus("connected");
      setWs(websocket);

      // Subscribe to detection updates
      websocket.send(JSON.stringify({ type: "subscribe" }));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "detection") {
          handleNewDetection(data);
        } else if (data.type === "camera_status") {
          updateCameraStatus(data.cameras);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setWsStatus("disconnected");
      setWs(null);

      // Attempt to reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsStatus("error");
    };
  }, []);

  // Handle new detection from WebSocket
  const handleNewDetection = useCallback((detection) => {
    // Add to camera detections
    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === detection.camera_id
          ? {
              ...cam,
              detections: [detection, ...cam.detections.slice(0, 4)],
            }
          : cam,
      ),
    );

    // Add to event log
    setEventLog((prev) => [detection, ...prev.slice(0, 99)]);

    // Update stats
    setStats((prev) => ({
      ...prev,
      totalEvents: prev.totalEvents + 1,
      totalFire: prev.totalFire + (detection.detection_type === "fire" ? 1 : 0),
      totalSmoke:
        prev.totalSmoke + (detection.detection_type === "smoke" ? 1 : 0),
    }));
  }, []);

  // Update camera status
  const updateCameraStatus = useCallback((cameraStatusList) => {
    setCameras((prev) =>
      prev.map((cam) => {
        const statusUpdate = cameraStatusList.find((c) => c.id === cam.id);
        return statusUpdate ? { ...cam, status: statusUpdate.status } : cam;
      }),
    );
  }, []);

  // Start/stop camera monitoring
  const toggleCameraMonitoring = async (cameraId, currentStatus) => {
    try {
      const action = currentStatus === "online" ? "stop" : "start";
      const response = await fetch("/api/camera-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, camera_id: cameraId }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} monitoring`);

      // Reload cameras to get updated status
      await loadCameras();
    } catch (error) {
      console.error("Error toggling camera monitoring:", error);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getDetectionIcon = (type) => {
    return type === "fire" ? (
      <Flame className="text-red-500" size={16} />
    ) : (
      <Activity className="text-orange-500" size={16} />
    );
  };

  return (
    <div className="min-h-screen bg-[#263043] text-white font-inter">
      {/* Header */}
      <header className="bg-[#2D384E] border-b border-[#37425B] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="text-teal-400" size={24} />
            <h1 className="text-xl font-semibold">
              Fire & Smoke Detection System
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              {wsStatus === "connected" ? (
                <>
                  <Wifi className="text-green-400" size={16} />
                  <span className="text-green-400">Connected</span>
                </>
              ) : wsStatus === "connecting" ? (
                <>
                  <Activity
                    className="text-yellow-400 animate-pulse"
                    size={16}
                  />
                  <span className="text-yellow-400">Connecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="text-red-400" size={16} />
                  <span className="text-red-400">Disconnected</span>
                </>
              )}
            </div>
            <button className="p-2 hover:bg-[#37425B] rounded-lg">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#2D384E] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-blue-400" size={20} />
                <div>
                  <div className="text-2xl font-semibold">
                    {stats.totalEvents}
                  </div>
                  <div className="text-sm text-slate-400">Total Events</div>
                </div>
              </div>
            </div>

            <div className="bg-[#2D384E] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Flame className="text-red-400" size={20} />
                <div>
                  <div className="text-2xl font-semibold text-red-400">
                    {stats.totalFire}
                  </div>
                  <div className="text-sm text-slate-400">Fire Detected</div>
                </div>
              </div>
            </div>

            <div className="bg-[#2D384E] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Activity className="text-orange-400" size={20} />
                <div>
                  <div className="text-2xl font-semibold text-orange-400">
                    {stats.totalSmoke}
                  </div>
                  <div className="text-sm text-slate-400">Smoke Detected</div>
                </div>
              </div>
            </div>

            <div className="bg-[#2D384E] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Monitor className="text-green-400" size={20} />
                <div>
                  <div className="text-2xl font-semibold">
                    {cameras.filter((c) => c.status === "online").length}/
                    {cameras.length}
                  </div>
                  <div className="text-sm text-slate-400">Cameras Online</div>
                </div>
              </div>
            </div>
          </div>

          {/* Camera Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {cameras.map((camera) => (
              <div key={camera.id} className="bg-[#2D384E] rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Eye
                      className={
                        camera.status === "online"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                      size={20}
                    />
                    <h3 className="font-medium">{camera.name}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${camera.status === "online" ? "bg-green-400" : "bg-red-400"}`}
                      ></div>
                      <span
                        className={`text-sm ${camera.status === "online" ? "text-green-400" : "text-red-400"}`}
                      >
                        {camera.status}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        toggleCameraMonitoring(camera.id, camera.status)
                      }
                      className="p-1 hover:bg-[#37425B] rounded text-slate-400 hover:text-white"
                    >
                      {camera.status === "online" ? (
                        <Square size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Video Feed Placeholder */}
                <div className="bg-[#1A202C] rounded-lg aspect-video mb-4 relative flex items-center justify-center border border-[#37425B]">
                  {camera.status === "online" ? (
                    <div className="text-slate-400 text-center">
                      <Monitor size={48} className="mx-auto mb-2 opacity-50" />
                      <div className="text-sm">Live Feed</div>
                      <div className="text-xs text-slate-500">{camera.id}</div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-center">
                      <WifiOff size={48} className="mx-auto mb-2 opacity-50" />
                      <div className="text-sm">Camera Offline</div>
                    </div>
                  )}

                  {/* Detection Overlays */}
                  {camera.detections?.slice(0, 2).map((detection, index) => (
                    <div
                      key={detection.id}
                      className={`absolute top-2 right-2 text-xs px-2 py-1 rounded ${
                        detection.detection_type === "fire"
                          ? "bg-red-500/90 text-white"
                          : "bg-orange-500/90 text-white"
                      }`}
                      style={{ top: `${8 + index * 28}px` }}
                    >
                      {detection.detection_type.toUpperCase()}{" "}
                      {(detection.confidence * 100).toFixed(0)}%
                    </div>
                  ))}
                </div>

                {/* Recent Detections List */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-300">
                    Recent Detections
                  </div>
                  {camera.detections?.length > 0 ? (
                    <div className="space-y-1">
                      {camera.detections.slice(0, 3).map((detection) => (
                        <div
                          key={detection.id}
                          className="flex items-center gap-2 text-xs text-slate-400"
                        >
                          {getDetectionIcon(detection.detection_type)}
                          <span className="capitalize">
                            {detection.detection_type}
                          </span>
                          <span>
                            ({(detection.confidence * 100).toFixed(0)}%)
                          </span>
                          <span className="ml-auto">
                            {formatTime(detection.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      No recent detections
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Event Log Sidebar */}
        <aside className="w-80 bg-[#2D384E] border-l border-[#37425B] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-slate-400" size={20} />
            <h2 className="font-medium">Event Log</h2>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {eventLog.length > 0 ? (
              eventLog.map((event) => (
                <div
                  key={event.id}
                  className="bg-[#263043] rounded-lg p-3 border border-[#37425B]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getDetectionIcon(event.detection_type)}
                    <span className="font-medium text-sm capitalize">
                      {event.detection_type} Detected
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        event.confidence > 0.8
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {(event.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <div>Camera: {event.camera_name}</div>
                    <div>{formatTime(event.timestamp)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-8">
                <AlertTriangle size={48} className="mx-auto mb-2 opacity-50" />
                <div className="text-sm">No events detected</div>
                <div className="text-xs">System is monitoring...</div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
