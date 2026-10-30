import {validateRhythm, rhythmOf, setRhythm} from './rhythm.mjs';
import {audioFps} from '../audio-model.mjs';

export function visibleRhythm(report, {first, last, pixelsPerTick = 14}) {
  const value = report?._styk?.traitRhythm;
  if (!value || value.visible === false) return {beats: [], markers: []};
  try { validateRhythm(value); } catch { return {beats: [], markers: []}; }
  const fps = audioFps(report), interval = fps * 60 / value.bpm, origin = value.offset * fps;
  if (!(interval > 0) || !Number.isFinite(first) || !Number.isFinite(last) || last < first) return {beats: [], markers: []};
  const density = Math.max(1, Math.ceil(12 / Math.max(.0001, interval * pixelsPerTick)));
  const stride = density > 1 ? Math.ceil(density / value.beatsPerBar) * value.beatsPerBar : 1;
  const start = Math.max(0, Math.ceil((first - origin - .5) / interval / stride) * stride), beats = [];
  for (let index = start; beats.length < 1024; index += stride) {
    const tick = Math.round(origin + index * interval); if (tick > last) break;
    if (tick >= first && beats.at(-1)?.tick !== tick) beats.push({tick, index, downbeat: index % value.beatsPerBar === 0});
  }
  return {beats, markers: value.markers.filter(m => m.tick >= first && m.tick <= last)};
}

/** Paint after the native ruler. Tick coordinates stay owned by the timeline. */
export function paintRhythmGuide(ctx, report, {first, last, xAt, ruler, height, colors, pixelsPerTick}) {
  const {beats, markers} = visibleRhythm(report, {first, last, pixelsPerTick});
  if (!beats.length && !markers.length) return;
  ctx.save(); ctx.strokeStyle = colors.accent; ctx.fillStyle = colors.accent;
  for (const beat of beats) {
    const x = Math.round(xAt(beat.tick)) + .5;
    ctx.globalAlpha = beat.downbeat ? .65 : .3;
    ctx.fillRect(x, ruler - (beat.downbeat ? 8 : 4), beat.downbeat ? 2 : 1, beat.downbeat ? 8 : 4);
    if (beat.downbeat) { ctx.globalAlpha = .12; ctx.fillRect(x, ruler, 1, height - ruler); }
  }
  ctx.globalAlpha = .9;
  for (const marker of markers) {
    const x = xAt(marker.tick);
    ctx.beginPath(); ctx.moveTo(x, ruler - 1); ctx.lineTo(x - 5, ruler - 9); ctx.lineTo(x + 5, ruler - 9); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, ruler); ctx.lineTo(x, height); ctx.stroke(); ctx.globalAlpha = .9;
  }
  ctx.restore();
}
export function markerNear(report, tick, pixelsPerTick = 14) {
  if (report?._styk?.traitRhythm?.visible === false) return null;
  const markers = report?._styk?.traitRhythm?.markers;
  if (!Array.isArray(markers)) return null;
  return markers.filter(m => Number.isInteger(m.tick) && typeof m.label === 'string' && Math.abs(m.tick - tick) * pixelsPerTick <= 7)
    .sort((a, b) => Math.abs(a.tick - tick) - Math.abs(b.tick - tick))[0] ?? null;
}
export function adjacentMarker(editor, direction) {
  const markers = [...rhythmOf(editor).markers].sort((a, b) => a.tick - b.tick);
  return direction < 0 ? markers.findLast(m => m.tick < editor.tick) : markers.find(m => m.tick > editor.tick);
}
export function addRhythmMarker(editor, tick, label = 'Repère') {
  const value = rhythmOf(editor);
  return setRhythm(editor, {...value, visible: true, markers: [...value.markers.filter(m => m.tick !== tick), {tick, label}].sort((a, b) => a.tick - b.tick)});
}
