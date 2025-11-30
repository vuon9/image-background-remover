import React, { useState } from 'react';
import { Eraser, Wand2, Download, Sparkles, Loader2, Upload, Bot, Zap, BrainCircuit, RotateCcw } from 'lucide-react';
import { AppState } from '../types';

interface ToolbarProps {
  state: AppState;
  onAutoRemove: () => void;
  onAiRemove: () => void;
  onDownload: () => void;
  onUndo: () => void;
  onBrushSizeChange: (size: number) => void;
  onToleranceChange: (val: number) => void;
  onSmoothingChange: (val: number) => void;
  onUploadClick: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  state,
  onAutoRemove,
  onAiRemove,
  onDownload,
  onUndo,
  onBrushSizeChange,
  onToleranceChange,
  onSmoothingChange,
  onUploadClick
}) => {
  const [activeTab, setActiveTab] = useState<'ALGO' | 'AI'>('ALGO');

  return (
    <div className="h-full bg-gray-800 border-l border-gray-700 flex flex-col p-4 w-80 space-y-6 overflow-y-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles className="text-purple-400 w-5 h-5" />
          Editor Tools
        </h2>
        <p className="text-gray-400 text-sm">Refine your image</p>
      </div>

      {/* Upload New */}
      <div className="pb-4 border-b border-gray-700">
         <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
        >
          <Upload size={16} />
          <span>New Image</span>
        </button>
      </div>

      {/* Removal Method Section */}
      <div className="pb-4 border-b border-gray-700">
         <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3 block">
            Removal Method
         </label>

         {/* Tabs */}
         <div className="flex p-1 bg-gray-900/50 rounded-lg mb-4 border border-gray-700">
            <button
               onClick={() => setActiveTab('ALGO')}
               className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                   activeTab === 'ALGO' 
                   ? 'bg-gray-700 text-white shadow-sm ring-1 ring-gray-600' 
                   : 'text-gray-400 hover:text-gray-200'
               }`}
            >
               <Zap size={14} />
               Fast Mode
            </button>
            <button
               onClick={() => setActiveTab('AI')}
               className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                   activeTab === 'AI' 
                   ? 'bg-gradient-to-r from-blue-900/40 to-purple-900/40 text-blue-200 shadow-sm ring-1 ring-blue-500/30' 
                   : 'text-gray-400 hover:text-gray-200'
               }`}
            >
               <BrainCircuit size={14} />
               AI Model
            </button>
         </div>

         {/* Content - Algorithmic */}
         {activeTab === 'ALGO' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-3 bg-gray-700/30 p-3 rounded-lg border border-gray-700">
                    {/* Tolerance */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Color Tolerance</span>
                            <span>{state.tolerance}%</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={state.tolerance}
                            onChange={(e) => onToleranceChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>

                    {/* Smoothing */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Smooth Edges</span>
                            <span>{state.smoothing > 0 ? state.smoothing : 'Off'}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            value={state.smoothing}
                            onChange={(e) => onSmoothingChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <button
                        onClick={onAutoRemove}
                        disabled={state.isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium transition-all text-sm mt-2"
                    >
                        <Wand2 size={16} />
                        <span>Apply Removal</span>
                    </button>
                </div>
            </div>
         )}

         {/* Content - AI */}
         {activeTab === 'AI' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-3 rounded-lg border border-blue-500/20 space-y-3">
                     <p className="text-[10px] text-blue-200/70 leading-relaxed">
                        Uses <strong>Gemini 2.5</strong> to intelligently understand the scene and separate the subject from the background. Best for complex images.
                     </p>
                     
                     <button
                        onClick={onAiRemove}
                        disabled={state.isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium transition-all shadow-lg"
                    >
                        {state.isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        <span>Process with Gemini</span>
                    </button>
                </div>
             </div>
         )}
      </div>

      {/* Manual Tools */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <Eraser size={14} /> Manual Touch-up
            </label>
            <button 
                onClick={onUndo}
                title="Undo (Ctrl+Z)"
                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
                <RotateCcw size={14} />
            </button>
        </div>
        
        <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
          <p className="text-[10px] text-gray-400 mb-3">Click and drag on the right image to erase parts manually.</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
                <span>Eraser Size</span>
                <span>{state.brushSize}px</span>
            </div>
            <input
                type="range"
                min="5"
                max="100"
                value={state.brushSize}
                onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            {/* Visual indicator of brush size */}
            <div className="flex justify-center pt-2 h-8 items-center">
                 <div 
                    className="rounded-full bg-pink-500/50 border border-pink-500"
                    style={{ width: state.brushSize / 2.5, height: state.brushSize / 2.5 }}
                 ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-gray-700 pt-6">
        <div className="mb-4">
            <p className="text-xs font-mono text-gray-400 mb-1">Filename:</p>
            {state.isAnalysing ? (
                <div className="flex items-center gap-2 text-xs text-yellow-400 animate-pulse">
                    <Sparkles size={12} /> Gemini is analyzing...
                </div>
            ) : (
                <div className="bg-gray-900 px-3 py-2 rounded text-sm text-green-400 font-mono truncate border border-gray-700">
                    {state.fileName || 'image'}.png
                </div>
            )}
        </div>
        <button
          onClick={onDownload}
          disabled={!state.processedImage}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-bold transition-all"
        >
          <Download size={18} />
          <span>Save PNG</span>
        </button>
      </div>

    </div>
  );
};

export default Toolbar;