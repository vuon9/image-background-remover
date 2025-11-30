import React, { useRef, useEffect, useState, useCallback } from 'react';
import { removeBackgroundSmart, applyManualEraser } from '../utils/imageProcessing';

interface WorkspaceProps {
  originalImage: HTMLImageElement;
  brushSize: number;
  tolerance: number;
  smoothing: number;
  triggerAutoRemove: number; // Increment to trigger
  triggerUndo: number; // Increment to trigger undo
  processedImageOverride: string | null; // For AI generated result
  onProcessedImageUpdate: (dataUrl: string) => void;
}

const ImageWorkspace: React.FC<WorkspaceProps> = ({
  originalImage,
  brushSize,
  tolerance,
  smoothing,
  triggerAutoRemove,
  triggerUndo,
  processedImageOverride,
  onProcessedImageUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<ImageData[]>([]);
  
  // State for canvas scaling to fit screen
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Custom Cursor State
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const [showCursor, setShowCursor] = useState(false);
  
  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !originalImage) return;

    // Set dimensions to match image
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw initial image
      ctx.drawImage(originalImage, 0, 0);
      onProcessedImageUpdate(canvas.toDataURL('image/png'));
      // Reset history
      historyRef.current = [];
    }

    // Calculate fit scale
    const fitScale = Math.min(
      container.clientWidth / originalImage.width,
      container.clientHeight / originalImage.height
    );
    setScale(fitScale * 0.9); // 90% fit
  }, [originalImage]);

  // Handle AI Image Override
  useEffect(() => {
    if (processedImageOverride && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvasRef.current!.width = img.width;
            canvasRef.current!.height = img.height;
            ctx?.clearRect(0, 0, img.width, img.height);
            ctx?.drawImage(img, 0, 0);
            onProcessedImageUpdate(canvasRef.current!.toDataURL('image/png'));
            // Save state to history (start of new chain)
            if (ctx) {
               historyRef.current = [ctx.getImageData(0, 0, img.width, img.height)];
            }
        };
        img.src = processedImageOverride;
    }
  }, [processedImageOverride]);

  // Handle Auto Remove Trigger
  useEffect(() => {
    if (triggerAutoRemove === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Reset to original before applying algorithm
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear first
    ctx.drawImage(originalImage, 0, 0);

    removeBackgroundSmart(ctx, canvas.width, canvas.height, tolerance, smoothing);
    onProcessedImageUpdate(canvas.toDataURL('image/png'));
    
    // Save to history
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];

  }, [triggerAutoRemove, originalImage, tolerance, smoothing]);

  // Handle Undo
  useEffect(() => {
     if (triggerUndo === 0) return;
     const canvas = canvasRef.current;
     const ctx = canvas?.getContext('2d');
     if (!canvas || !ctx || historyRef.current.length === 0) return;

     // Pop current state (if we are treating history as 'previous' states, we need to handle it carefully)
     // Strategy: historyRef contains previous states. 
     const previousState = historyRef.current.pop();
     if (previousState) {
        ctx.putImageData(previousState, 0, 0);
        onProcessedImageUpdate(canvas.toDataURL('image/png'));
     }

  }, [triggerUndo]);

  const saveToHistory = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (canvas && ctx) {
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          historyRef.current.push(data);
          // Limit history size to prevent memory issues
          if (historyRef.current.length > 20) {
              historyRef.current.shift();
          }
      }
  };


  // Mouse Events for Eraser & Cursor
  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Save state before modifying
    saveToHistory();

    setIsDrawing(true);
    const { x, y } = getMousePos(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      applyManualEraser(ctx, x, y, brushSize);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update Custom Cursor Position
    setCursorX(e.clientX);
    setCursorY(e.clientY);

    if (!isDrawing) return;
    const { x, y } = getMousePos(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      applyManualEraser(ctx, x, y, brushSize);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    // Update parent state for download
    if (canvasRef.current) {
        onProcessedImageUpdate(canvasRef.current.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex-1 flex gap-4 p-6 h-full overflow-hidden bg-gray-900 relative">
      
      {/* Custom Cursor */}
      {showCursor && (
        <div 
          className="fixed pointer-events-none border-2 border-pink-500 rounded-full z-50 bg-pink-500/10"
          style={{
             left: cursorX,
             top: cursorY,
             width: brushSize * 2 * scale, // Scale cursor to match canvas visual zoom
             height: brushSize * 2 * scale,
             transform: 'translate(-50%, -50%)'
          }}
        ></div>
      )}

      {/* Original Image View */}
      <div className="flex-1 flex flex-col min-w-0">
        <h3 className="text-gray-400 mb-2 font-medium text-center uppercase text-sm tracking-wider">Original</h3>
        <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center p-4 overflow-hidden shadow-inner">
             <img 
                src={originalImage.src} 
                style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    maxWidth: 'none', // Allow scaling
                    maxHeight: 'none'
                }}
                className="shadow-2xl"
                alt="Original" 
             />
        </div>
      </div>

      {/* Processed Canvas View */}
      <div className="flex-1 flex flex-col min-w-0">
        <h3 className="text-purple-400 mb-2 font-medium text-center uppercase text-sm tracking-wider flex items-center justify-center gap-2">
            Output 
            <span className="text-xs bg-purple-900/50 px-2 py-0.5 rounded text-purple-300 border border-purple-800">Drag to Erase</span>
        </h3>
        <div 
            ref={containerRef}
            className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center p-4 overflow-hidden relative shadow-inner"
        >
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseUp(); setShowCursor(false); }}
                onMouseEnter={() => setShowCursor(true)}
                style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                }}
                className="z-10 cursor-none" // Hide default cursor
            />
        </div>
      </div>
    </div>
  );
};

export default ImageWorkspace;