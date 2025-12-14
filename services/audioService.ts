import { FFT_SIZE, SMOOTHING_TIME_CONSTANT, MIN_DECIBELS, MAX_DECIBELS } from '../constants';

export class AudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Float32Array | null = null;
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    if (this.audioContext) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
      
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);
      
      this.dataArray = new Float32Array(this.analyser.fftSize);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw new Error('Microphone permission denied or not supported.');
    }
  }

  stop(): void {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getMetrics(): { rms: number; db: number } {
    if (!this.analyser || !this.dataArray) {
      return { rms: 0, db: MIN_DECIBELS };
    }

    this.analyser.getFloatTimeDomainData(this.dataArray);

    // RMS Calculation: sqrt(sum(x^2)/n)
    let sumSquares = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sumSquares += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sumSquares / this.dataArray.length);

    // Decibel Conversion: 20 * log10(rms)
    // We clamp the result to avoid -Infinity
    let db = MIN_DECIBELS;
    if (rms > 0) {
      db = 20 * Math.log10(rms);
    }

    // Clamp to min/max range for safety
    db = Math.max(MIN_DECIBELS, Math.min(db, 0));

    return { rms, db };
  }
}

export const audioService = new AudioService();