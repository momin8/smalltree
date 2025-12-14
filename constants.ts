// Audio Processing
export const FFT_SIZE = 2048;
export const SMOOTHING_TIME_CONSTANT = 0.8; // For AnalyserNode
export const EMA_ALPHA = 0.2; // Exponential Moving Average factor for UI smoothing
export const MIN_DECIBELS = -100;
export const MAX_DECIBELS = -10; // Approx 0dBFS is max, but microphones rarely hit it without clipping

// Game Rules
export const CALIBRATION_DURATION_MS = 3000;
export const DEFAULT_NOISE_FLOOR_DB = -60;
export const TARGET_DB_OFFSET = 10; // User needs to be 10dB louder than background
export const SCREAM_THRESHOLD_DB = -15; // Considered "Too Loud" relative to digital full scale

// Growth Mechanics
// Target: 10 seconds per tree (Demo Mode).
// 10 seconds * 10 points per second = 100.
export const MAX_TREE_HEIGHT = 100; 
export const POINTS_PER_SECOND = 10; // Growth speed
export const UPDATE_INTERVAL_MS = 100; // Game loop tick rate