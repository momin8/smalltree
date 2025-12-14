import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw, Settings, Award, Volume2, TreeDeciduous, Clock, Percent } from 'lucide-react';
import { AppState, SessionStats } from './types';
import { audioService } from './services/audioService';
import { 
  EMA_ALPHA, 
  UPDATE_INTERVAL_MS, 
  CALIBRATION_DURATION_MS,
  DEFAULT_NOISE_FLOOR_DB,
  TARGET_DB_OFFSET,
  SCREAM_THRESHOLD_DB,
  MAX_TREE_HEIGHT,
  POINTS_PER_SECOND
} from './constants';
import { Tree } from './components/Tree';
import { VolumeMeter } from './components/VolumeMeter';

const App: React.FC = () => {
  // State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentDb, setCurrentDb] = useState<number>(-100);
  const [noiseFloor, setNoiseFloor] = useState<number>(DEFAULT_NOISE_FLOOR_DB);
  // treeScore is now derived from stats.validDuration, so state is removed.
  const [stats, setStats] = useState<SessionStats>({ 
    duration: 0, 
    validDuration: 0, 
    tooLoudDuration: 0,
    treesPlanted: 0 
  });
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Refs for loops and non-render state
  const intervalRef = useRef<number | null>(null);
  const calibrationStartTimeRef = useRef<number>(0);
  
  // Computed values
  const targetDb = noiseFloor + TARGET_DB_OFFSET;
  
  // Calculate constants for duration logic
  const TREE_CYCLE_SECONDS = MAX_TREE_HEIGHT / POINTS_PER_SECOND; // 100 / 10 = 10 seconds
  
  // Growth is now a function of valid duration within the current cycle
  const currentTreeProgressSeconds = stats.validDuration % TREE_CYCLE_SECONDS;
  const growthPercentage = Math.min(100, (currentTreeProgressSeconds / TREE_CYCLE_SECONDS) * 100);
  
  const focusPercent = stats.duration > 0 ? Math.round((stats.validDuration / stats.duration) * 100) : 0;
  
  const getVolumeStatus = useCallback((db: number) => {
    if (appState === AppState.CALIBRATING) return 'calibrating';
    if (appState !== AppState.READING) return 'idle';
    if (db > SCREAM_THRESHOLD_DB) return 'loud';
    if (db >= targetDb) return 'good';
    return 'quiet';
  }, [appState, targetDb]);

  // Game Loop
  const tick = useCallback(() => {
    const { db } = audioService.getMetrics();
    
    // Smooth the visual DB value
    setCurrentDb(prev => prev * (1 - EMA_ALPHA) + db * EMA_ALPHA);

    if (appState === AppState.CALIBRATING) {
      const elapsed = Date.now() - calibrationStartTimeRef.current;
      if (elapsed > CALIBRATION_DURATION_MS) {
        // End Calibration
        const detectedFloor = Math.max(-80, Math.min(-30, db));
        setNoiseFloor(detectedFloor);
        setAppState(AppState.IDLE);
      }
    } else if (appState === AppState.READING) {
      // Game Rules
      const timeDelta = UPDATE_INTERVAL_MS / 1000;

      if (db > SCREAM_THRESHOLD_DB) {
        // Too loud - penalty or no growth
        setStats(s => ({ 
          ...s, 
          duration: s.duration + timeDelta, 
          tooLoudDuration: s.tooLoudDuration + timeDelta 
        }));
      } else if (db >= targetDb) {
        // Good volume - update duration and check for tree planting
        setStats(s => {
          const newValidDuration = s.validDuration + timeDelta;
          
          // Calculate trees planted based on total valid duration
          // Floor(Total Seconds / Cycle) gives the count of completed trees
          const newTreesPlanted = Math.floor(newValidDuration / TREE_CYCLE_SECONDS);
          
          return {
            ...s,
            duration: s.duration + timeDelta,
            validDuration: newValidDuration,
            treesPlanted: newTreesPlanted
          };
        });
      } else {
        // Too quiet
        setStats(s => ({ ...s, duration: s.duration + timeDelta }));
      }
    }
  }, [appState, targetDb, TREE_CYCLE_SECONDS]);

  useEffect(() => {
    if (appState === AppState.CALIBRATING || appState === AppState.READING) {
      intervalRef.current = window.setInterval(tick, UPDATE_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [appState, tick]);

  // Actions
  const handleStartCalibration = async () => {
    try {
      setPermissionError(null);
      await audioService.start();
      calibrationStartTimeRef.current = Date.now();
      setAppState(AppState.CALIBRATING);
    } catch (e) {
      setPermissionError("请允许麦克风权限以使用此应用。");
    }
  };

  const handleStartReading = async () => {
    try {
      setPermissionError(null);
      if (!audioService['audioContext']) {
        await audioService.start();
      }
      setAppState(AppState.READING);
    } catch (e) {
      setPermissionError("需要麦克风权限。");
    }
  };

  const handleStop = () => {
    setAppState(AppState.COMPLETED); // Go to summary view when stopped manually
    audioService.stop();
  };

  const handleReset = () => {
    audioService.stop();
    setStats({ duration: 0, validDuration: 0, tooLoudDuration: 0, treesPlanted: 0 });
    setAppState(AppState.IDLE);
  };

  const handleContinue = () => {
    setAppState(AppState.IDLE);
    setStats({ duration: 0, validDuration: 0, tooLoudDuration: 0, treesPlanted: 0 });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Helper to distribute background trees
  const renderBackgroundForest = () => {
    if (stats.treesPlanted === 0) return null;
    
    // Limit visible background trees to avoid clutter
    const maxVisibleTrees = 12;
    const visibleCount = Math.min(maxVisibleTrees, stats.treesPlanted);
    const leftCount = Math.ceil(visibleCount / 2);
    const rightCount = Math.floor(visibleCount / 2);

    return (
      <div className="absolute inset-x-0 bottom-4 h-32 flex items-end justify-between px-4 -z-10 pointer-events-none">
        {/* Left Forest Group */}
        <div className="flex items-end justify-end w-5/12 space-x-[-12px] pr-8">
           {Array.from({ length: leftCount }).map((_, i) => (
             <TreeDeciduous 
                key={`l-${i}`} 
                size={30 + (i % 3) * 8} 
                className="text-emerald-200/90 drop-shadow-sm transform -scale-x-100 transition-all duration-700 animate-in slide-in-from-bottom-2 fade-in" 
                style={{ animationDelay: `${i * 100}ms` }}
             />
           ))}
        </div>

        {/* Right Forest Group */}
        <div className="flex items-end justify-start w-5/12 space-x-[-12px] pl-8">
           {Array.from({ length: rightCount }).map((_, i) => (
             <TreeDeciduous 
                key={`r-${i}`} 
                size={34 + (i % 3) * 8} 
                className="text-emerald-300/90 drop-shadow-sm transition-all duration-700 animate-in slide-in-from-bottom-2 fade-in" 
                style={{ animationDelay: `${i * 100}ms` }}
             />
           ))}
        </div>

        {/* Overflow Badge */}
        {stats.treesPlanted > maxVisibleTrees && (
            <div className="absolute top-0 right-10 bg-emerald-100 text-emerald-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-bounce">
              +{stats.treesPlanted - maxVisibleTrees}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-between max-w-md mx-auto relative overflow-hidden bg-sky-50">
      
      {/* Header & Stats Dashboard */}
      <div className="w-full z-10 space-y-4 p-4">
        {/* Title Row */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Volume2 className="text-green-600" />
              朗读养小树
            </h1>
            <p className="text-slate-500 text-xs">大声朗读，种出森林 (10秒/棵 - 演示版)</p>
          </div>
          {appState === AppState.IDLE && (
              <button 
                onClick={handleStartCalibration}
                className="p-2 bg-white rounded-full shadow border border-slate-200 text-slate-600 hover:text-green-600 transition-colors"
                title="环境噪音校准"
              >
                <Settings size={20} />
              </button>
          )}
        </div>

        {/* Stats Grid Dashboard */}
        <div className="grid grid-cols-3 gap-3">
             {/* Trees */}
             <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center shadow-sm border border-white/50 animate-in slide-in-from-top-4 fade-in duration-700 delay-100 fill-mode-both">
                <div className="flex items-center gap-1 text-green-600">
                   <TreeDeciduous size={18} />
                   <span key={stats.treesPlanted} className="font-bold text-xl animate-in zoom-in slide-in-from-bottom-2 duration-300">
                     {stats.treesPlanted}
                   </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1">小树</span>
             </div>

             {/* Time Comparison */}
             <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center shadow-sm border border-white/50 animate-in slide-in-from-top-4 fade-in duration-700 delay-200 fill-mode-both">
                <div className="flex items-baseline gap-1">
                   <span className={`font-bold text-lg leading-none tabular-nums transition-colors duration-300 ${appState === AppState.READING && currentDb >= targetDb ? 'text-green-600' : 'text-slate-700'}`}>
                     {formatTime(stats.validDuration)}
                   </span>
                   <span className="text-slate-400 text-[10px] tabular-nums">/ {formatTime(stats.duration)}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1">朗读时长</span>
             </div>

             {/* Concentration % */}
             <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center shadow-sm border border-white/50 animate-in slide-in-from-top-4 fade-in duration-700 delay-300 fill-mode-both">
                <div className="flex items-center gap-1">
                   <span key={focusPercent} className={`font-bold text-xl tabular-nums animate-in zoom-in duration-300 ${focusPercent >= 80 ? 'text-purple-600' : 'text-slate-600'}`}>
                     {focusPercent}<span className="text-sm">%</span>
                   </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1">专注度</span>
             </div>
        </div>
      </div>

      {/* Permission Error */}
      {permissionError && (
        <div className="absolute top-20 left-6 right-6 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg z-50 text-center text-sm">
          {permissionError}
        </div>
      )}

      {/* Main Visual Area 
          Changed: justify-end and removed large padding to allow tree to sit comfortably 
      */}
      <div className="flex-1 w-full flex flex-col items-center justify-end relative isolate min-h-0">
        
        {/* Background Forest - aligned with bottom of tree area */}
        {renderBackgroundForest()}

        {/* The Active Growing Tree */}
        <Tree key={stats.treesPlanted} growth={growthPercentage} state={appState} />
        
        {/* Summary Modal */}
        {appState === AppState.COMPLETED && (
          <div className="absolute inset-4 z-50 bg-white/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center animate-in fade-in zoom-in p-6 text-center border border-slate-100 shadow-2xl">
            <Award className="w-16 h-16 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">朗读总结</h2>
            
            <div className="grid grid-cols-3 gap-3 w-full my-6">
              <div className="bg-green-50 p-4 rounded-xl flex flex-col items-center col-span-3">
                <span className="text-green-600 font-bold text-4xl">{stats.treesPlanted}</span>
                <span className="text-green-800 text-xs uppercase tracking-wider font-semibold mt-1">种下的小树</span>
              </div>
              
              <div className="bg-blue-50 p-2 rounded-xl flex flex-col items-center justify-center min-h-[80px]">
                <span className="text-blue-600 font-bold text-lg">{formatTime(stats.validDuration)}</span>
                <span className="text-blue-800 text-[10px] uppercase font-semibold">有效朗读</span>
              </div>

               <div className="bg-slate-50 p-2 rounded-xl flex flex-col items-center justify-center min-h-[80px]">
                <span className="text-slate-600 font-bold text-lg">{formatTime(stats.duration)}</span>
                <span className="text-slate-500 text-[10px] uppercase font-semibold">总耗时</span>
              </div>

               <div className="bg-purple-50 p-2 rounded-xl flex flex-col items-center justify-center min-h-[80px]">
                <span className="text-purple-600 font-bold text-lg">
                    {focusPercent}%
                </span>
                <span className="text-purple-800 text-[10px] uppercase font-semibold">专注度</span>
              </div>
            </div>

            <p className="text-slate-600 mb-6 text-sm">
              坚持每天朗读，种出一片大森林！
            </p>
            
            <button 
              onClick={handleContinue}
              className="bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 w-full"
            >
              开始新练习
            </button>
          </div>
        )}
      </div>

      {/* Controls & Meter - Increased bottom padding to lift buttons safely above browser navigation */}
      <div className="w-full space-y-4 pb-20 pt-2 px-6 z-10 bg-gradient-to-t from-sky-50 via-sky-50 to-transparent">
        
        {/* Helper Text */}
        <div className="text-center h-5">
          {appState === AppState.CALIBRATING && (
             <span className="text-yellow-600 text-xs font-medium animate-pulse">保持安静... 正在测量环境底噪...</span>
          )}
          {appState === AppState.PAUSED && (
             <span className="text-slate-400 text-xs">已暂停</span>
          )}
          {appState === AppState.READING && (
             <span className="text-slate-400 text-xs">继续朗读，种下一棵树！</span>
          )}
        </div>

        <VolumeMeter 
          currentDb={currentDb}
          noiseFloorDb={noiseFloor}
          targetDb={targetDb}
          maxDb={SCREAM_THRESHOLD_DB}
          status={getVolumeStatus(currentDb)}
        />

        <div className="flex justify-center gap-4">
          {appState === AppState.READING ? (
            <button 
              onClick={handleStop}
              className="h-16 w-16 bg-amber-500 rounded-full flex items-center justify-center shadow-lg hover:bg-amber-600 transition-all active:scale-95 text-white"
            >
              <Pause size={32} fill="currentColor" />
            </button>
          ) : (
             <button 
              onClick={handleStartReading}
              disabled={appState === AppState.CALIBRATING || appState === AppState.COMPLETED}
              className={`h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 text-white ${
                (appState === AppState.CALIBRATING || appState === AppState.COMPLETED) ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <Play size={32} fill="currentColor" className="ml-1" />
            </button>
          )}

          {(appState === AppState.PAUSED || appState === AppState.READING) && (
             <button 
               onClick={handleReset}
               className="h-16 w-16 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center shadow hover:bg-slate-50 transition-all text-slate-500"
             >
               <RefreshCw size={24} />
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;