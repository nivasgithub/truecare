import React, { useRef, useEffect, useState } from 'react';
import { Icons } from './ui';

interface SmartCameraProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export default function SmartCamera({ onCapture, onClose }: SmartCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // Prefer back camera
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready to play
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setLoading(false);
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Unable to access camera. Please check permissions.");
        onClose();
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(dataUrl);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-fade-in">
      
      {/* Header / Close */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white font-bold flex items-center gap-2">
           <Icons.Camera className="text-white w-5 h-5" />
           {loading ? "Starting Camera..." : "Take Photo"}
        </div>
        <button onClick={onClose} className="bg-white/20 p-2 rounded-full text-white backdrop-blur-sm hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close camera">
          <span className="text-2xl leading-none">&times;</span>
        </button>
      </div>

      {/* Video Area */}
      <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover" 
          muted 
          playsInline
        />
        
        {/* Simple Grid Overlay for Alignment */}
        {!loading && (
          <div className="absolute inset-0 pointer-events-none opacity-30">
             <div className="w-full h-full border-2 border-white/50 relative">
                 <div className="absolute top-1/3 left-0 w-full h-px bg-white/50"></div>
                 <div className="absolute top-2/3 left-0 w-full h-px bg-white/50"></div>
                 <div className="absolute left-1/3 top-0 h-full w-px bg-white/50"></div>
                 <div className="absolute left-2/3 top-0 h-full w-px bg-white/50"></div>
             </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 w-full p-8 flex justify-center items-center bg-gradient-to-t from-black/80 to-transparent gap-8">
         <button 
           onClick={captureImage}
           className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-all flex items-center justify-center active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
           aria-label="Capture photo"
         >
           <div className="w-16 h-16 bg-white rounded-full"></div>
         </button>
      </div>
    </div>
  );
}