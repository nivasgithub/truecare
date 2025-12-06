import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Icons, Button } from './ui';

interface SmartCameraProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export default function SmartCamera({ onCapture, onClose }: SmartCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [detections, setDetections] = useState<cocoSsd.DetectedObject[]>([]);
  const requestRef = useRef<number>(0);

  // Load TF Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load TF model", err);
        setLoading(false); // Fail gracefully, still allow camera
      }
    };
    loadModel();
  }, []);

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
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            detectFrame();
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
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [model]); // Restart detection loop if model loads late

  const detectFrame = async () => {
    if (videoRef.current && model && videoRef.current.readyState === 4) {
      const predictions = await model.detect(videoRef.current);
      setDetections(predictions);
      
      // Draw Logic
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current && videoRef.current) {
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
        // Match canvas size to video
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        
        predictions.forEach(prediction => {
          const [x, y, width, height] = prediction.bbox;
          
          // Style for bounding box
          ctx.strokeStyle = '#00FFFF';
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, width, height);
          
          // Label background
          ctx.fillStyle = '#00FFFF';
          ctx.fillRect(x, y - 20, width, 20);
          
          // Label text
          ctx.fillStyle = '#000000';
          ctx.font = '16px Arial';
          ctx.fillText(
            `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
            x + 5,
            y - 5
          );
        });
      }
    }
    requestRef.current = requestAnimationFrame(detectFrame);
  };

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
           <Icons.Sparkle className="text-cyan-400 w-5 h-5" />
           {loading ? "Initializing AI..." : "Smart Scan Active"}
        </div>
        <button onClick={onClose} className="bg-white/20 p-2 rounded-full text-white backdrop-blur-sm hover:bg-white/30">
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
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        
        {/* Helper overlay if nothing detected */}
        {!loading && detections.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white/30 rounded-xl w-64 h-80 pointer-events-none flex items-center justify-center">
             <p className="text-white/50 text-xs font-medium bg-black/50 px-2 py-1 rounded">Align Document</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 w-full p-8 flex justify-center items-center bg-gradient-to-t from-black/80 to-transparent gap-8">
         <button 
           onClick={captureImage}
           className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-all flex items-center justify-center active:scale-95"
         >
           <div className="w-16 h-16 bg-white rounded-full"></div>
         </button>
      </div>
    </div>
  );
}