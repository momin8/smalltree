import React, { useEffect, useRef, useState } from 'react';

interface TreeProps {
  growth: number; // 0 to 100
  state: string;
}

// Singleton AudioContext to prevent resource exhaustion and browser limits
let sfxContext: AudioContext | null = null;

const getSfxContext = () => {
  if (!sfxContext) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sfxContext = new AudioCtx();
    }
  }
  return sfxContext;
};

const playGrowthSound = (stage: 'sprout' | 'grow1' | 'grow2' | 'complete') => {
  const ctx = getSfxContext();
  if (!ctx) return;
  
  // Ensure context is running (browsers suspend it if created without gesture)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const t = ctx.currentTime;

  // Helper to create a nice pluck/chime sound
  const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    
    // Envelope for "plucked" or "chime" sound
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  switch (stage) {
    case 'sprout': 
      // "Pop" sound - quick pitch slide for sprouting
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
      break;
    
    case 'grow1': 
      // Gentle chord (Major 3rd interval) - Foliage growing
      playTone(440.00, 'sine', t, 0.5, 0.15); // A4
      playTone(554.37, 'sine', t + 0.05, 0.5, 0.15); // C#5
      break;

    case 'grow2': 
      // Brighter chord (Major triad) - More foliage
      playTone(523.25, 'sine', t, 0.5, 0.15); // C5
      playTone(659.25, 'sine', t + 0.05, 0.5, 0.15); // E5
      playTone(783.99, 'sine', t + 0.1, 0.5, 0.15); // G5
      break;

    case 'complete': 
      // Victory Arpeggio - Tree complete
      const speed = 0.08;
      playTone(523.25, 'triangle', t, 0.6, 0.15);       // C5
      playTone(659.25, 'triangle', t + speed, 0.6, 0.15); // E5
      playTone(783.99, 'triangle', t + speed*2, 0.6, 0.15); // G5
      playTone(1046.50, 'sine', t + speed*3, 0.8, 0.2); // C6
      // Sparkle
      playTone(2093.00, 'sine', t + speed*3, 1.0, 0.1); // C7
      break;
  }
};

export const Tree: React.FC<TreeProps> = ({ growth, state }) => {
  const lastMilestoneRef = useRef<number>(0);
  const [isMounting, setIsMounting] = useState(true);

  // Trigger mounting animation
  useEffect(() => {
    setIsMounting(true);
    const timer = setTimeout(() => setIsMounting(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Sound effects logic
  useEffect(() => {
    // Reset if a new tree starts (growth drops significantly)
    if (growth < lastMilestoneRef.current && growth < 10) {
      lastMilestoneRef.current = 0;
    }

    // Milestones for sound effects
    if (growth > 5 && lastMilestoneRef.current < 5) {
      if (state === 'READING') playGrowthSound('sprout');
      lastMilestoneRef.current = 5;
    } else if (growth > 40 && lastMilestoneRef.current < 40) {
      if (state === 'READING') playGrowthSound('grow1');
      lastMilestoneRef.current = 40;
    } else if (growth > 70 && lastMilestoneRef.current < 70) {
      if (state === 'READING') playGrowthSound('grow2');
      lastMilestoneRef.current = 70;
    } else if (growth >= 100 && lastMilestoneRef.current < 100) {
      if (state === 'READING') playGrowthSound('complete');
      lastMilestoneRef.current = 100;
    }
  }, [growth, state]);

  // Staged growth calculations
  // Trunk grows from height 30 to 100
  const trunkHeight = 30 + (growth / 100) * 70;
  
  // Helper for smooth elastic scaling of parts
  const getScale = (startPercent: number, endPercent: number) => {
    if (growth < startPercent) return 0;
    if (growth >= endPercent) return 1;
    const progress = (growth - startPercent) / (endPercent - startPercent);
    // Add a little overshoot for "pop" effect
    return Math.min(1, progress * (1.2 - progress * 0.2)); 
  };

  // Define growth stages for different foliage clusters
  const centerScale = getScale(0, 20);
  const leftScale = getScale(15, 45);
  const rightScale = getScale(30, 60);
  const topScale = getScale(50, 80);

  // Dynamic sway duration: fast (2s) when small, slow (5s) when big to simulate weight
  const swayDuration = 2 + (growth / 100) * 3; 

  // Dynamic foliage color - shifts to gold/autumn at the very end
  const foliageColor = growth > 95 ? '#F59E0B' : '#10B981';

  return (
    // Changed: Uses h-full with max-h-[50vh] to adapt to available space while preventing it from dominating small screens
    <div className="relative flex justify-center items-end h-full max-h-[45vh] w-full">
      <style>{`
        @keyframes elastic-pop {
          0% { transform: scale(0) translateY(50px); opacity: 0; }
          60% { transform: scale(1.1) translateY(-10px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .tree-entry {
          animation: elastic-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Tree SVG Container 
          - viewBox adjusted to (0 -60 200 260) to provide headroom for the canopy
          - h-full w-auto allows it to scale nicely within the container
      */}
      <svg 
        viewBox="0 -60 200 260" 
        className={`h-full w-auto drop-shadow-xl ${isMounting ? 'tree-entry' : 'transition-transform duration-300'}`}
        style={{ transformOrigin: 'bottom center' }}
      >
        {/* Ground */}
        <ellipse 
          cx="100" cy="190" rx={80 * getScale(0, 10)} ry="10" 
          fill="#D1FAE5" 
          className="transition-all duration-300 ease-linear"
        />
        
        {/* Trunk */}
        <path 
          d={`M90,190 L110,190 L105,${190 - trunkHeight} L95,${190 - trunkHeight} Z`} 
          fill="#8B5CF6" 
          // Synced duration with the foliage transition to prevent detachment
          className="transition-all duration-300 ease-linear"
        />

        {/* Foliage Group Wrapper - Handles Vertical Position Sync */}
        <g 
           style={{ 
             transform: `translate(100px, ${190 - trunkHeight}px)`,
             transition: 'transform 300ms linear' // Strictly matches trunk transition
           }}
        >
          {/* Sway Group - Handles Rotation without breaking position */}
          <g 
            className={state === 'READING' ? 'animate-sway' : ''}
            style={{ 
              animationDuration: `${swayDuration}s`,
              transformOrigin: '0px 0px' // Rotate around the attachment point (top of trunk)
            }}
          >
             {/* Drawing Group - Centers the foliage drawing relative to (0,0) */}
             <g transform="translate(-100, -100)">
                {/* Main Center Cluster */}
                <circle cx="100" cy="90" r={45 * centerScale} fill={foliageColor} 
                  className="transition-all duration-500 ease-out"
                />
                
                {/* Left Cluster */}
                <circle cx="65" cy="100" r={35 * leftScale} fill={foliageColor} opacity="0.9"
                  className="transition-all duration-500 ease-out"
                />

                {/* Right Cluster */}
                <circle cx="135" cy="100" r={35 * rightScale} fill={foliageColor} opacity="0.9"
                  className="transition-all duration-500 ease-out"
                />

                {/* Top Cluster */}
                <circle cx="100" cy="50" r={40 * topScale} fill={foliageColor} opacity="0.95"
                  className="transition-all duration-500 ease-out"
                />
                
                {/* Fruits - Pop in at various stages */}
                {growth > 40 && <circle cx="80" cy="80" r="6" fill="#EF4444" className="animate-in zoom-in duration-300" />}
                {growth > 60 && <circle cx="120" cy="90" r="6" fill="#EF4444" className="animate-in zoom-in duration-300" />}
                {growth > 75 && <circle cx="100" cy="60" r="6" fill="#EF4444" className="animate-in zoom-in duration-300" />}
                {growth > 85 && <circle cx="130" cy="70" r="6" fill="#EF4444" className="animate-in zoom-in duration-300" />}
                {growth > 92 && <circle cx="70" cy="60" r="6" fill="#EF4444" className="animate-in zoom-in duration-300" />}
             </g>
          </g>
        </g>
      </svg>
      
      {/* Growth/Reading Particles */}
      {state === 'READING' && (
        <div className="absolute bottom-4 w-full flex justify-center pointer-events-none">
             <div className="animate-ping absolute inline-flex h-32 w-32 rounded-full bg-green-400 opacity-10 duration-1000"></div>
        </div>
      )}
    </div>
  );
};