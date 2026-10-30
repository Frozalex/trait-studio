// Local rhythm suggestions from the existing PCM mixer. No audio leaves the device.
// Memory is bounded to 10 ms envelopes; decoded PCM remains one second at a time.
export const ANALYSIS_LIMIT_SECONDS = 600;
const RATE = 100;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const cancelled = () => new DOMException('Analyse annulée.', 'AbortError');

export class RhythmEnvelope {
  constructor(sampleRate = 48000) {
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Invalid audio sample rate.');
    this.hop = Math.round(sampleRate / RATE);
    this.alphaLow = 1 - Math.exp(-2 * Math.PI * 180 / sampleRate);
    this.alphaDC = 1 - Math.exp(-2 * Math.PI * 30 / sampleRate);
    this.low = [0, 0]; this.dc = [0, 0];
    this.energy = this.bassEnergy = this.count = 0;
    this.full = []; this.bass = [];
  }
  push(stereo) {
    if (!(stereo instanceof Float32Array) || stereo.length % 2) throw new Error('Invalid PCM block.');
    for (let i = 0; i < stereo.length; i += 2) {
      const left = Number.isFinite(stereo[i]) ? stereo[i] : 0;
      const right = Number.isFinite(stereo[i + 1]) ? stereo[i + 1] : 0;
      this.low[0] += this.alphaLow * (left - this.low[0]);
      this.low[1] += this.alphaLow * (right - this.low[1]);
      this.dc[0] += this.alphaDC * (left - this.dc[0]);
      this.dc[1] += this.alphaDC * (right - this.dc[1]);
      this.energy += (left * left + right * right) / 2;
      this.bassEnergy += ((this.low[0] - this.dc[0]) ** 2 + (this.low[1] - this.dc[1]) ** 2) / 2;
      if (++this.count === this.hop) this.flush();
    }
  }
  flush() {
    if (!this.count) return;
    if (this.full.length >= ANALYSIS_LIMIT_SECONDS * RATE + 1) throw new Error('Audio analysis limit exceeded.');
    this.full.push(Math.sqrt(this.energy / this.count));
    this.bass.push(Math.sqrt(this.bassEnergy / this.count));
    this.energy = this.bassEnergy = this.count = 0;
  }
  finish() { this.flush(); return suggestRhythm(this.full, this.bass); }
}

function novelty(values) {
  const out = new Float64Array(values.length);
  let previous = 0;
  for (let i = 0; i < values.length; i++) {
    out[i] = Math.max(0, values[i] - previous);
    previous = previous * .72 + values[i] * .28;
  }
  return out;
}
function maximum(values) { let value = 0; for (const x of values) value = Math.max(value, x); return value; }
function peaks(values, threshold, separation = 18) {
  const found = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] < threshold || values[i] < (values[i - 1] ?? 0) || values[i] <= (values[i + 1] ?? 0)) continue;
    const last = found.at(-1);
    if (last && i - last.index < separation) { if (values[i] > last.strength) found[found.length - 1] = {index: i, strength: values[i]}; }
    else found.push({index: i, strength: values[i]});
  }
  return found;
}

export function suggestRhythm(full, bass) {
  if (full.length !== bass.length || full.length > ANALYSIS_LIMIT_SECONDS * RATE + 1) throw new Error('Invalid rhythm envelope.');
  if ([...full, ...bass].some(x => !Number.isFinite(x) || x < 0)) throw new Error('Invalid audio energy.');
  const fullMax = maximum(full), bassMax = maximum(bass), empty = {bpm: null, alternatives: [], confidence: 0, bassEntry: null, attacks: [], seconds: full.length / RATE};
  if (fullMax < .0001 || full.length < 20) return empty;
  const f = novelty(full), b = novelty(bass), fMax = maximum(f), bMax = maximum(b);
  const bassUseful = bassMax > fullMax * .06 && bMax > .0001;
  const flux = Float64Array.from(f, (x, i) => (x / (fMax || 1)) * (bassUseful ? .35 : 1) + (bassUseful ? .65 * b[i] / bMax : 0));
  const attacks = peaks(flux, Math.max(.12, maximum(flux) * .17));
  const bassAttacks = bassUseful ? peaks(b, bMax * .2) : [];
  const bassEntry = bassAttacks.find((p, i) => bassAttacks[i + 2] && bassAttacks[i + 2].index - p.index < 400)?.index / RATE;
  const scores = [];
  // A bounded autocorrelation of onset energy; half/double tempo remain visible alternatives.
  for (let lag = 30; lag <= 100; lag++) {
    let product = 0, a2 = 0, b2 = 0;
    for (let i = lag; i < flux.length; i++) { product += flux[i] * flux[i - lag]; a2 += flux[i] ** 2; b2 += flux[i - lag] ** 2; }
    scores.push({lag, score: product / (Math.sqrt(a2 * b2) || 1)});
  }
  // Prefer a pulse supported by adjacent attacks over a stronger third/half harmonic.
  const gaps = attacks.slice(1).map((p, i) => p.index - attacks[i].index).filter(x => x >= 30 && x <= 100).sort((a, b) => a - b);
  const gap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
  const rank = p => p.score * (gap ? .75 + .25 * Math.exp(-(((p.lag - gap) / 4) ** 2)) : 1);
  const candidates = scores.filter((p, i) => p.score >= (scores[i - 1]?.score ?? 0) && p.score > (scores[i + 1]?.score ?? 0))
    .sort((a, b) => rank(b) - rank(a));
  const best = candidates[0];
  const stable = attacks.length >= 5 && full.length >= 300 && best?.score > .25;
  const tempo = p => {
    const before = scores[p.lag - 31]?.score ?? p.score, after = scores[p.lag - 29]?.score ?? p.score;
    const denominator = before - 2 * p.score + after;
    const correction = denominator ? clamp(.5 * (before - after) / denominator, -.5, .5) : 0;
    return Math.round(clamp(6000 / (p.lag + correction), 60, 200) * 10) / 10;
  };
  return {...empty, bpm: stable ? tempo(best) : null,
    alternatives: stable ? candidates.filter(p => p.score >= best.score * .55).slice(0, 3).map(tempo) : [],
    confidence: stable ? Math.round(clamp(best.score, 0, 1) * 100) : 0,
    bassEntry: Number.isFinite(bassEntry) ? bassEntry : null,
    attacks: attacks.slice(0, 256).map(p => ({time: p.index / RATE, strength: Math.round(p.strength * 100) / 100}))};
}

export async function analyzeMix(read, duration, {sampleRate = 48000, isCancelled = () => false} = {}) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Aucun son à analyser.');
  const seconds = Math.min(duration, ANALYSIS_LIMIT_SECONDS), frames = Math.floor(seconds * sampleRate), envelope = new RhythmEnvelope(sampleRate);
  for (let start = 0; start < frames; start += sampleRate) {
    if (isCancelled()) throw cancelled();
    envelope.push(await read(start, Math.min(sampleRate, frames - start)));
    // Let a worker process cancellation even when a range consists only of silence.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  if (isCancelled()) throw cancelled();
  return {...envelope.finish(), truncated: duration > ANALYSIS_LIMIT_SECONDS};
}
