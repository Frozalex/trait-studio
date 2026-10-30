import {node, button, field} from './ui.mjs';
import {rhythmOf, setRhythm, beatGrid, tapTempo} from './rhythm.mjs';
import {addRhythmMarker, adjacentMarker} from './timeline-rhythm.mjs';
import {audioFps, audioState} from '../audio-model.mjs';

export function rhythmPane(content, {editor, pause, safe, say, audioEngine}) {
  let value = structuredClone(rhythmOf(editor)), taps = [], windowStart = 0, controller, disposed = false;
  const fps = audioFps(editor.report);
  const options = node('div', 'trait-options');
  const bpm = field('Tempo (BPM)', value.bpm, 'number', {min:'20',max:'300',step:'.1'});
  const offset = field('Début du rythme (secondes)', value.offset, 'number', {min:'0',max:'36000',step:'.001'});
  const meter = field('Temps par mesure', value.beatsPerBar, 'number', {min:'1',max:'12',step:'1'});
  const grid = node('div', 'trait-beat-grid'), markers = node('div', 'trait-markers');
  const label = field('Nom du repère', 'Accent', 'text', {maxLength:60}), counter = node('p', 'trait-hint');
  const visible = node('input'); visible.type = 'checkbox'; visible.checked = value.visible !== false;
  const visibleLabel = node('label', 'trait-check'); visibleLabel.append(visible, node('span', null, 'Afficher les repères dans la timeline'));
  const sync = () => ({...rhythmOf(editor), bpm:Number(bpm.input.value), offset:Number(offset.input.value), beatsPerBar:Number(meter.input.value), visible:visible.checked});
  function refresh() {
    grid.replaceChildren();
    const beats = beatGrid(value, fps, editor.totalTicks, {start:windowStart,limit:64});
    counter.textContent = `${fps.toFixed(2).replace(/\.00$/, '')} images/s · ${editor.totalTicks} images · image actuelle ${Math.round(editor.tick) + 1}`;
    for (const beat of beats) {
      const b = button(`${beat.bar}.${beat.beat}`, () => {pause(); editor.seek(beat.tick); counter.textContent = `Mesure ${beat.bar}, temps ${beat.beat} · image ${beat.tick + 1}`;});
      b.dataset.downbeat = String(beat.beat === 1); b.title = `Image ${beat.tick + 1} · ${(beat.tick / fps).toFixed(3)} s`; grid.append(b);
    }
    if (!beats.length) grid.append(node('p', 'trait-hint', 'Aucun temps dans cette plage. Allonge la scène ou ajuste le début du rythme.'));
    markers.replaceChildren();
    for (const marker of value.markers) {
      const row = node('div', 'trait-pose-row');
      row.append(button(`${marker.label} · ${marker.tick + 1}`, () => {pause(); editor.seek(marker.tick, {allowBeyondEnd:true});}),
        button('Retirer', safe(() => {setRhythm(editor, {...rhythmOf(editor),markers:rhythmOf(editor).markers.filter(m => m.tick !== marker.tick)}); value = structuredClone(rhythmOf(editor)); refresh();})));
      markers.append(row);
    }
  }
  options.append(bpm.box, offset.box, meter.box);
  const actionsRow = node('div', 'trait-actions');
  actionsRow.append(button('Taper le tempo', () => {
    const now = performance.now(); if (taps.length && now - taps.at(-1) > 3000) taps = [];
    taps = [...taps.slice(-7), now]; const tempo = tapTempo(taps); if (tempo) bpm.input.value = tempo;
    say(tempo ? `${tempo} BPM · applique la grille pour l’enregistrer.` : 'Continue à taper au rythme de la musique.');
  }), button('Début = image actuelle', () => {offset.input.value = (editor.tick / fps).toFixed(3);}),
  button('Appliquer la grille', safe(() => {const next = sync(); setRhythm(editor, next); value = next; refresh(); say('Grille enregistrée avec le projet.');}), 'primary'));
  const pagination = node('div', 'trait-actions');
  pagination.append(button('Début', () => {windowStart = 0; refresh();}), button('Autour du curseur', () => {windowStart = Math.floor(editor.tick); refresh();}),
    button('Suite', () => {const current = beatGrid(value, fps, editor.totalTicks, {start:windowStart,limit:64}); if (current.length) windowStart = current.at(-1).tick + 1; refresh();}));
  const markerActions = node('div', 'trait-actions');
  const add = button('Poser un repère', safe(() => {addRhythmMarker(editor, Math.round(editor.tick), label.input.value.trim().slice(0,60) || 'Accent'); value = structuredClone(rhythmOf(editor)); refresh();})); add.id = 'trait-add-marker';
  markerActions.append(add, ...[-1, 1].map(direction => button(direction < 0 ? 'Repère précédent' : 'Repère suivant', () => {
    const marker = adjacentMarker(editor, direction); if (marker) {pause(); editor.seek(marker.tick, {allowBeyondEnd:true}); refresh();}
  })));

  const analysis = node('section', 'trait-analysis'), result = node('div', 'trait-analysis-result');
  result.setAttribute('role', 'status');
  const analyze = button('Analyser le son', safe(async () => {
    if (controller || disposed) return;
    const report = editor.report, source = audioState(report), run = new AbortController(); controller = run;
    result.replaceChildren(node('p', 'trait-hint', 'Analyse locale du mix audible…')); analyze.disabled = true; cancel.hidden = false;
    try {
      const suggestion = await audioEngine.analyzeRhythm(report, {signal:run.signal});
      if (disposed || run.signal.aborted) return;
      if (editor.report !== report || audioState(editor.report) !== source) throw new Error('Le son a changé. Relance l’analyse.');
      result.replaceChildren();
      const tempo = suggestion.bpm ? `${suggestion.bpm} BPM` : 'Tempo indéterminé';
      const bass = suggestion.bassEntry === null ? 'arrivée des basses indéterminée' : `basses vers ${suggestion.bassEntry.toFixed(2)} s`;
      result.append(node('strong', null, `${tempo} · ${bass}`), node('p', 'trait-hint', `Suggestion à vérifier à l’écoute.${suggestion.truncated ? ' Les dix premières minutes ont été analysées.' : ''}`));
      if (suggestion.bpm || suggestion.bassEntry !== null) {
        const choices = node('div', 'trait-actions');
        for (const tempo of suggestion.alternatives) choices.append(button(`${tempo} BPM`, () => {bpm.input.value = tempo; say('Tempo sélectionné. Applique la grille pour l’enregistrer.');}));
        choices.append(button('Utiliser la suggestion', safe(() => {
          if (editor.report !== report || audioState(editor.report) !== source) throw new Error('Le son a changé. Relance l’analyse.');
          const next = {...sync(), bpm:suggestion.bpm ?? Number(bpm.input.value), offset:suggestion.bassEntry ?? Number(offset.input.value), visible:true};
          if (suggestion.bassEntry !== null) {
            const tick = Math.round(suggestion.bassEntry * fps);
            next.markers = [...next.markers.filter(m => m.tick !== tick), {tick,label:'Entrée des basses'}].sort((a,b) => a.tick-b.tick);
          }
          setRhythm(editor, next); value = next; bpm.input.value = next.bpm; offset.input.value = next.offset; visible.checked = true; refresh();
          say('Suggestion appliquée. Les repères sont visibles dans la timeline ; Annuler restaure les réglages précédents.');
        }), 'primary'));
        result.append(choices);
      }
    } catch (error) {if (!disposed) result.replaceChildren(node('p', 'trait-hint', run.signal.aborted ? 'Analyse annulée.' : error.message));}
    finally {if (controller === run) controller = null; if (!disposed) {analyze.disabled = false; cancel.hidden = true;}}
  }));
  analyze.id = 'trait-analyze-audio'; analyze.disabled = !audioEngine;
  const cancel = button('Annuler l’analyse', () => controller?.abort()); cancel.hidden = true;
  const analysisActions = node('div', 'trait-actions'); analysisActions.append(analyze, cancel);
  analysis.append(node('strong', null, 'Trouver le rythme'), node('p', 'trait-hint', 'Analyse le mix des pistes actives, jusqu’à dix minutes. Les pistes muettes sont ignorées. Le fichier reste sur ton appareil.'), analysisActions, result);
  content.append(node('p', 'trait-hint', 'Importe ta musique avec Audio dans la timeline. Analyse-la ou règle le tempo à la main.'), analysis, options, visibleLabel, actionsRow, counter, grid, pagination, label.box, markerActions, markers);
  refresh();
  return () => {disposed = true; controller?.abort();};
}
