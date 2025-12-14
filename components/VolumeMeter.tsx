import React from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface VolumeMeterProps {
  currentDb: number;
  noiseFloorDb: number;
  targetDb: number;
  maxDb: number;
  status: 'quiet' | 'good' | 'loud' | 'calibrating' | 'idle';
}

export const VolumeMeter: React.FC<VolumeMeterProps> = ({ 
  currentDb, 
  noiseFloorDb, 
  targetDb, 
  maxDb,
  status
}) => {
  // Normalize dB to 0-100% for the progress bar
  // Range typically: -70dB (0%) to -10dB (100%)
  const minRange = -70;
  const maxRange = -10;
  
  const normalize = (db: number) => {
    return Math.min(100, Math.max(0, ((db - minRange) / (maxRange - minRange)) * 100));
  };

  const currentPercent = normalize(currentDb);
  const targetPercent = normalize(targetDb);
  const maxPercent = normalize(maxDb);

  let barColor = 'bg-slate-300';
  let icon = <MicOff className="w-6 h-6 text-slate-400" />;
  let message = "准备开始";

  switch (status) {
    case 'calibrating':
      barColor = 'bg-yellow-400';
      icon = <Mic className="w-6 h-6 text-yellow-500 animate-pulse" />;
      message = "正在检测环境噪音...";
      break;
    case 'quiet':
      barColor = 'bg-yellow-300';
      icon = <Mic className="w-6 h-6 text-yellow-500" />;
      message = "声音有点小...";
      break;
    case 'good':
      barColor = 'bg-green-500';
      icon = <Mic className="w-6 h-6 text-green-500 animate-bounce" />;
      message = "声音很棒！";
      break;
    case 'loud':
      barColor = 'bg-red-500';
      icon = <AlertCircle className="w-6 h-6 text-red-500 animate-ping" />;
      message = "声音太大啦！不要尖叫。";
      break;
  }

  return (
    <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-semibold text-sm ${
            status === 'loud' ? 'text-red-500' : 
            status === 'good' ? 'text-green-600' : 'text-slate-600'
          }`}>
            {message}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {Math.round(currentDb)} dB
        </span>
      </div>

      {/* Meter Container */}
      <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden w-full border border-slate-200">
        
        {/* Target Zone Marker */}
        <div 
          className="absolute top-0 bottom-0 bg-green-100 border-l border-green-300 z-0 transition-all"
          style={{ 
            left: `${targetPercent}%`, 
            width: `${maxPercent - targetPercent}%` 
          }}
        />

        {/* Max Zone Marker */}
        <div 
          className="absolute top-0 bottom-0 bg-red-50 z-0 border-l border-red-300 transition-all"
          style={{ 
            left: `${maxPercent}%`, 
            right: 0 
          }}
        />

        {/* Active Volume Bar */}
        <div 
          className={`h-full transition-all duration-100 ease-out z-10 ${barColor}`}
          style={{ width: `${currentPercent}%` }}
        />
        
        {/* Threshold Indicators */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-20 opacity-50" style={{ left: `${targetPercent}%` }} />
        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 opacity-50" style={{ left: `${maxPercent}%` }} />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
        <span>安静</span>
        <span>达标</span>
        <span>过大</span>
      </div>
    </div>
  );
};