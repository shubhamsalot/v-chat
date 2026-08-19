"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, AlertTriangle } from "lucide-react";

interface CameraPreviewProps {
  onStreamReady?: (stream: MediaStream) => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ onStreamReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function initCamera() {
      setIsLoading(true);
      setError(null);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        });

        if (active) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          if (onStreamReady) {
            onStreamReady(mediaStream);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (active) {
          console.error("Camera access error:", err);
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Camera & microphone permissions were denied. Please allow device access in your browser settings to use V-Chat.");
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setError("No webcam or microphone was detected on this device.");
          } else {
            setError("Unable to start video preview. Please ensure another application is not using your camera.");
          }
          setIsLoading(false);
        }
      }
    }

    initCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full aspect-video bg-[#141417] border border-[#24242C] rounded-[6px] overflow-hidden shadow-xl flex items-center justify-center">
      {isLoading && (
        <div className="flex flex-col items-center space-y-2 text-[#80808A]">
          <div className="w-6 h-6 border-2 border-[#FF4B2B] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Initializing camera feed...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-6 text-center max-w-sm flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-[4px] bg-[#FF4B2B]/10 border border-[#FF4B2B]/30 flex items-center justify-center text-[#FF4B2B]">
            <CameraOff className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#F2F2F0]">Camera Unavailable</h3>
          <p className="text-xs text-[#9595A0] leading-relaxed">{error}</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
          stream && !error ? "opacity-100" : "opacity-0"
        }`}
      />

      {stream && !error && (
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-[4px] border border-white/10 flex items-center space-x-1.5 text-[11px] text-[#D0D0D8]">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Self Preview (Muted)</span>
        </div>
      )}
    </div>
  );
};
