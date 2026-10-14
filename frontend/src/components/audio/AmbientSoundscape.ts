/**
 * AmbientSoundscape
 * A client-side, procedural ambient sound generator using the Web Audio API.
 * Produces an ethereal, low-volume warm harmonic drone with subtle modulation.
 * Starts strictly upon user request and ramps smoothly in and out.
 */

export class AmbientSoundscape {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isRunning: boolean = false
  private oscillators: OscillatorNode[] = []
  private filter: BiquadFilterNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null

  public init() {
    if (this.ctx) return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    this.ctx = new AudioCtx()
  }

  public async start(): Promise<boolean> {
    if (!this.ctx) {
      this.init()
    }
    if (!this.ctx) return false

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume()
      } catch {
        return false
      }
    }

    if (this.isRunning) return true

    const ctx = this.ctx
    const now = ctx.currentTime

    // Master gain
    this.masterGain = ctx.createGain()
    this.masterGain.gain.setValueAtTime(0.0001, now)
    // Fade in to gentle ambient level over 1.8s
    this.masterGain.gain.exponentialRampToValueAtTime(0.14, now + 1.8)
    this.masterGain.connect(ctx.destination)

    // Warm Lowpass Filter with resonance
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.setValueAtTime(320, now)
    this.filter.Q.setValueAtTime(2.2, now)
    this.filter.connect(this.masterGain)

    // LFO to slowly sweep filter cutoff for organic evolving breathing
    this.lfo = ctx.createOscillator()
    this.lfo.frequency.setValueAtTime(0.08, now) // slow 12s cycle
    this.lfoGain = ctx.createGain()
    this.lfoGain.gain.setValueAtTime(140, now)
    this.lfo.connect(this.lfoGain)
    this.lfoGain.connect(this.filter.frequency)
    this.lfo.start()

    // Harmonic Oscillators (Root D2 ~73.4Hz, 5th A2 ~110Hz, Octave D3 ~146.8Hz with slight detune)
    const tones = [
      { freq: 73.42, detune: -4, type: 'sine' as OscillatorType, vol: 0.35 },
      { freq: 73.42, detune: +5, type: 'triangle' as OscillatorType, vol: 0.25 },
      { freq: 110.0, detune: -3, type: 'sine' as OscillatorType, vol: 0.2 },
      { freq: 146.83, detune: +2, type: 'sine' as OscillatorType, vol: 0.15 },
      { freq: 220.0, detune: -5, type: 'sine' as OscillatorType, vol: 0.08 },
    ]

    this.oscillators = tones.map((t) => {
      const osc = ctx.createOscillator()
      osc.type = t.type
      osc.frequency.setValueAtTime(t.freq, now)
      osc.detune.setValueAtTime(t.detune, now)

      const oscGain = ctx.createGain()
      oscGain.gain.setValueAtTime(t.vol, now)

      osc.connect(oscGain)
      oscGain.connect(this.filter!)
      osc.start()
      return osc
    })

    this.isRunning = true
    return true
  }

  public stop() {
    if (!this.ctx || !this.isRunning) return
    const now = this.ctx.currentTime

    if (this.masterGain) {
      // Smooth fade out over 1.2 seconds
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)
    }

    setTimeout(() => {
      this.cleanupNodes()
      this.isRunning = false
    }, 1300)
  }

  private cleanupNodes() {
    this.oscillators.forEach((osc) => {
      try {
        osc.stop()
        osc.disconnect()
      } catch {
        // already stopped
      }
    })
    this.oscillators = []

    if (this.lfo) {
      try {
        this.lfo.stop()
        this.lfo.disconnect()
      } catch {
        // already stopped
      }
      this.lfo = null
    }

    if (this.lfoGain) {
      this.lfoGain.disconnect()
      this.lfoGain = null
    }

    if (this.filter) {
      this.filter.disconnect()
      this.filter = null
    }

    if (this.masterGain) {
      this.masterGain.disconnect()
      this.masterGain = null
    }
  }

  /**
   * Subtle tactile resonant click/chime on interaction when sound is enabled
   */
  public triggerFeedback(pitch = 520) {
    if (!this.ctx || !this.isRunning || this.ctx.state !== 'running') return
    const now = this.ctx.currentTime

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(pitch, now)
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.7, now + 0.12)

    gain.gain.setValueAtTime(0.035, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.13)
  }

  public destroy() {
    this.stop()
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close()
      } catch {
        // ignore
      }
      this.ctx = null
    }
  }

  public get active(): boolean {
    return this.isRunning
  }
}

