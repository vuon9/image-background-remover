
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { removeBackgroundSmart, removeBackgroundGrabCut } from '../utils/imageProcessing';

interface WorkspaceProps {
  originalImage: HTMLImageElement;
  brushSize: number;
  tolerance: number;
  smoothing: number;
  algorithm: 'FLOOD_FILL' | 'GRABCUT';
  triggerAutoRemove: number;
  triggerUndo: number;
  triggerManualApply: number;
  manualMaskPreview: boolean; // TRUE = Preview Result, FALSE = Show Red Mask
  manualToolMode: 'ADD' | 'SUBTRACT';
  processedImageOverride: string | null;
  onProcessedImageUpdate: (dataUrl: string) => void;
  onManualMaskChange: (hasEdits: boolean) => void;
}

const ImageWorkspace: React.FC<WorkspaceProps> = ({
  originalImage,
  brushSize,
  tolerance,
  smoothing,
  algorithm,
  triggerAutoRemove,
  triggerUndo,
  triggerManualApply,
  manualMaskPreview,
  manualToolMode,
  processedImageOverride,
  onProcessedImageUpdate,
  onManualMaskChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Backing Canvases (Layers)
  const baseLayerRef = useRef<HTMLCanvasElement | null>(null); // Committed processed image
  const maskLayerRef = useRef<HTMLCanvasElement | null>(null); // Current manual strokes (Red)

  const historyRef = useRef<ImageData[]>([]);
  const maskHistoryRef = useRef<ImageData[]>([]); // Track mask strokes for undo
  
  // State
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const [showCursor, setShowCursor] = useState(false);
  
  // --- Render Loop ---
  const renderCanvas = useCallback(() => {
     if (!displayCanvasRef.current || !baseLayerRef.current || !maskLayerRef.current) return;
     const ctx = displayCanvasRef.current.getContext('2d');
     if (!ctx) return;

     const w = displayCanvasRef.current.width;
     const h = displayCanvasRef.current.height;

     ctx.clearRect(0, 0, w, h);

     // 1. Draw Base Layer (The current processed image)
     ctx.globalCompositeOperation = 'source-over';
     ctx.drawImage(baseLayerRef.current, 0, 0);

     // 2. Draw Mask Layer based on mode
     if (manualMaskPreview) {
        // Preview Mode: The mask acts as an eraser to show the final result
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskLayerRef.current, 0, 0);
     } else {
        // Edit Mode: The mask is shown as a semi-transparent red overlay
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.6; // Transparency
        ctx.drawImage(maskLayerRef.current, 0, 0);
        ctx.globalAlpha = 1.0;
     }
     
     // Reset GCO
     ctx.globalCompositeOperation = 'source-over';

  }, [manualMaskPreview]);

  // --- Initialization ---
  useEffect(() => {
    if (!originalImage || !containerRef.current || !displayCanvasRef.current) return;

    // Create Offscreen Layers
    const w = originalImage.width;
    const h = originalImage.height;

    // Base Layer
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = w;
    baseCanvas.height = h;
    const baseCtx = baseCanvas.getContext('2d');
    baseCtx?.drawImage(originalImage, 0, 0);
    baseLayerRef.current = baseCanvas;

    // Mask Layer
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    maskLayerRef.current = maskCanvas;

    // Display Canvas
    displayCanvasRef.current.width = w;
    displayCanvasRef.current.height = h;

    // Reset History on new image load
    if (baseCtx) {
       historyRef.current = [baseCtx.getImageData(0, 0, w, h)];
    }
    maskHistoryRef.current = [];
    onManualMaskChange(false); // Reset dirty flag

    // Calc Scale
    const fitScale = Math.min(
      containerRef.current.clientWidth / w,
      containerRef.current.clientHeight / h
    );
    setScale(fitScale * 0.9);

    renderCanvas();
    onProcessedImageUpdate(baseCanvas.toDataURL('image/png'));
  }, [originalImage]);

  // --- Rerender when preview mode changes ---
  useEffect(() => {
     renderCanvas();
  }, [manualMaskPreview, renderCanvas]);


  // --- Handle AI Override ---
  useEffect(() => {
    if (processedImageOverride && baseLayerRef.current) {
        const img = new Image();
        img.onload = () => {
            const ctx = baseLayerRef.current!.getContext('2d');
            const w = baseLayerRef.current!.width;
            const h = baseLayerRef.current!.height;
            
            // Allow resizing if AI image is different? Assuming same size for now or scaling
            ctx?.clearRect(0, 0, w, h);
            ctx?.drawImage(img, 0, 0, w, h);
            
            // Clear mask and mask history
            const maskCtx = maskLayerRef.current?.getContext('2d');
            maskCtx?.clearRect(0, 0, w, h);
            maskHistoryRef.current = [];
            onManualMaskChange(false);

            // Add to history
            if (ctx) historyRef.current.push(ctx.getImageData(0, 0, w, h));

            renderCanvas();
            onProcessedImageUpdate(baseLayerRef.current!.toDataURL('image/png'));
        };
        img.src = processedImageOverride;
    }
  }, [processedImageOverride]);

  // --- Handle Auto Remove ---
  useEffect(() => {
    if (triggerAutoRemove === 0 || !originalImage || !baseLayerRef.current) return;
    
    const ctx = baseLayerRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const w = baseLayerRef.current.width;
    const h = baseLayerRef.current.height;

    // Reset to original before algo
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(originalImage, 0, 0);

    // CHOOSE ALGORITHM
    if (algorithm === 'GRABCUT') {
        removeBackgroundGrabCut(ctx, w, h, tolerance, smoothing);
    } else {
        removeBackgroundSmart(ctx, w, h, tolerance, smoothing);
    }
    
    // Clear mask and mask history
    const maskCtx = maskLayerRef.current?.getContext('2d');
    maskCtx?.clearRect(0, 0, w, h);
    maskHistoryRef.current = [];
    onManualMaskChange(false);

    // Save history (PUSH, don't overwrite)
    historyRef.current.push(ctx.getImageData(0, 0, w, h));

    renderCanvas();
    onProcessedImageUpdate(baseLayerRef.current.toDataURL('image/png'));

  }, [triggerAutoRemove, originalImage, tolerance, smoothing, algorithm]);

  // --- Handle Undo ---
  useEffect(() => {
     if (triggerUndo === 0 || !baseLayerRef.current || !maskLayerRef.current) return;
     
     // 1. Try Undoing Mask Stroke first (if any manual strokes exist unapplied)
     if (maskHistoryRef.current.length > 0) {
        const prevMaskState = maskHistoryRef.current.pop();
        const maskCtx = maskLayerRef.current.getContext('2d');
        if (prevMaskState && maskCtx) {
            maskCtx.putImageData(prevMaskState, 0, 0);
            renderCanvas();
        }
        
        // If we popped the last state, mask is effectively empty/clean
        if (maskHistoryRef.current.length === 0) {
            onManualMaskChange(false);
        }
        return; // Stop here, don't undo base layer
     }

     // 2. Fallback to Base Layer Undo (Previous applied actions)
     if (historyRef.current.length > 1) {
        historyRef.current.pop(); // Remove current state
        const prevState = historyRef.current[historyRef.current.length - 1];
        
        const ctx = baseLayerRef.current.getContext('2d');
        ctx?.putImageData(prevState, 0, 0);
        
        renderCanvas();
        onProcessedImageUpdate(baseLayerRef.current.toDataURL('image/png'));
     }
  }, [triggerUndo]);

  // --- Handle Manual Apply ---
  useEffect(() => {
      if (triggerManualApply === 0 || !baseLayerRef.current || !maskLayerRef.current) return;

      const baseCtx = baseLayerRef.current.getContext('2d');
      const maskCtx = maskLayerRef.current.getContext('2d');
      if (!baseCtx || !maskCtx) return;

      // Apply mask to base layer
      baseCtx.globalCompositeOperation = 'destination-out';
      baseCtx.drawImage(maskLayerRef.current, 0, 0);
      baseCtx.globalCompositeOperation = 'source-over'; // Reset

      // Clear mask layer after apply and reset mask history
      maskCtx.clearRect(0, 0, maskLayerRef.current.width, maskLayerRef.current.height);
      maskHistoryRef.current = [];
      onManualMaskChange(false);

      // Save new state to history
      historyRef.current.push(baseCtx.getImageData(0, 0, baseLayerRef.current.width, baseLayerRef.current.height));
      
      // Limit history size
      if (historyRef.current.length > 30) historyRef.current.shift();

      renderCanvas();
      onProcessedImageUpdate(baseLayerRef.current.toDataURL('image/png'));

  }, [triggerManualApply]);


  // --- Mouse Events for Mask Drawing ---
  const getMousePos = (e: React.MouseEvent) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const drawOnMask = (x: number, y: number) => {
      const ctx = maskLayerRef.current?.getContext('2d');
      if (ctx) {
          ctx.beginPath();
          ctx.arc(x, y, brushSize, 0, Math.PI * 2);
          
          if (manualToolMode === 'ADD') {
              ctx.globalCompositeOperation = 'source-over';
              ctx.fillStyle = '#ff0000'; // Pure red for mask data
          } else {
              // SUBTRACT mode: Remove from mask
              ctx.globalCompositeOperation = 'destination-out';
              ctx.fillStyle = '#000000'; // Color doesn't matter for dest-out
          }
          
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over'; // Reset
          renderCanvas();
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Save Mask History BEFORE drawing starts
    if (maskLayerRef.current) {
        const ctx = maskLayerRef.current.getContext('2d');
        if (ctx) {
             maskHistoryRef.current.push(ctx.getImageData(0, 0, maskLayerRef.current.width, maskLayerRef.current.height));
             // Limit mask history for memory
             if (maskHistoryRef.current.length > 20) maskHistoryRef.current.shift();
        }
    }
    
    // Notify parent that edits have started
    onManualMaskChange(true);

    setIsDrawing(true);
    const { x, y } = getMousePos(e);
    drawOnMask(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorX(e.clientX);
    setCursorY(e.clientY);
    if (!isDrawing) return;
    const { x, y } = getMousePos(e);
    drawOnMask(x, y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex-1 flex gap-4 p-6 h-full overflow-hidden bg-gray-900 relative">
      
      {/* Custom Cursor */}
      {showCursor && (
        <div 
          className={`fixed pointer-events-none border-2 rounded-full z-50 ${manualToolMode === 'ADD' ? 'border-pink-500 bg-pink-500/10' : 'border-blue-500 bg-blue-500/10'}`}
          style={{
             left: cursorX,
             top: cursorY,
             width: brushSize * 2 * scale,
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
                    maxWidth: 'none',
                    maxHeight: 'none'
                }}
                className="shadow-2xl"
                alt="Original" 
             />
        </div>
      </div>

      {/* Processed Canvas View */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="text-purple-400 font-medium text-center uppercase text-sm tracking-wider">Output</h3>
            {manualMaskPreview ? (
                <span className="text-[10px] bg-green-900/50 px-2 py-0.5 rounded text-green-300 border border-green-800">Preview Mode</span>
            ) : (
                <span className="text-[10px] bg-pink-900/50 px-2 py-0.5 rounded text-pink-300 border border-pink-800">
                    {manualToolMode === 'ADD' ? 'Adding to Mask' : 'Cleaning Mask'}
                </span>
            )}
        </div>
        
        <div 
            ref={containerRef}
            className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center p-4 overflow-hidden relative shadow-inner"
        >
            <canvas
                ref={displayCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseUp(); setShowCursor(false); }}
                onMouseEnter={() => setShowCursor(true)}
                style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                }}
                className="z-10 cursor-none" 
            />
        </div>
      </div>
    </div>
  );
};

export default ImageWorkspace;
