export enum AppState {
  IDLE = 'IDLE',
  CALIBRATING = 'CALIBRATING',
  READING = 'READING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export interface AudioMetrics {
  rms: number;      // Root Mean Square (raw energy)
  db: number;       // Decibels
  normalized: number; // 0-100 scale for UI
  isClipping: boolean;
}

export interface GameConfig {
  targetDbOffset: number; // How much louder than noise floor to count as valid
  maxDbLimit: number;     // Scream threshold
  growthRate: number;     // Points per valid frame
  maxHeight: number;      // Target score to finish
}

export interface SessionStats {
  duration: number;       // Total seconds active
  validDuration: number;  // Seconds in target zone
  tooLoudDuration: number; // Seconds screaming
  treesPlanted: number;   // Number of fully grown trees
}