import {node, button, field, download} from './ui.mjs';
import {capturePose, applyPose} from './poses.mjs';
import {buildGeometry, drawGeometry} from '../pivot/geometry.mjs';
import {objectBounds} from '../renderer-geometry.mjs';

function thumbnail(pose) {
  const canvas = node('canvas', 'trait-pose-preview'); canvas.width = 320; canvas.height = 224;
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `Aperçu : ${pose.name}`);
  try {
    const geometry = buildGeometry(pose.document, pose.document.keyframes[0]), bounds = objectBounds(geometry.drawables);
    const scale = Math.min(272 / Math.max(1, bounds.width), 176 / Math.max(1, bounds.height));
    const ctx = canvas.getContext('2d'); ctx.translate(160, 112); ctx.scale(scale, scale);
    ctx.translate(-bounds.x - bounds.width / 2, -bounds.y - bounds.height / 2); drawGeometry(ctx, geometry);
  } catch {canvas.setAttribute('aria-label', `Aperçu indisponible : ${pose.name}`);}
  return canvas;
}

export function posesPane(content, {bank, editor, dialog, safe, say}) {
  const intro = node('p', 'trait-hint', 'Retrouve tes poses par leur silhouette ou leur nom. Appliquer une pose conserve la position et la couleur du personnage.');
  const toolbar = node('div', 'trait-actions'), name = field('Nom de la pose', 'Ma pose', 'text', {maxLength:60});
  const search = field('Rechercher une pose', '', 'search', {placeholder:'Nom…'}), list = node('div', 'trait-pose-list');
  function refresh() {
    list.replaceChildren();
    const query = search.input.value.trim().toLocaleLowerCase(), poses = bank.poses.filter(p => p.name.toLocaleLowerCase().includes(query));
    if (!poses.length) list.append(node('p', 'trait-empty', bank.poses.length ? 'Aucune pose ne correspond à ce nom.' : 'Sélectionne un personnage dans la scène, puis enregistre sa première pose.'));
    for (const pose of poses) {
      const row = node('article', 'trait-pose-row trait-pose-card'), details = node('div', 'trait-pose-details'), title = node('strong', null, pose.name);
      const actions = node('div', 'trait-actions');
      const rename = () => {
        const input = field('Nouveau nom', pose.name, 'text', {maxLength:60}), form = node('form', 'trait-rename');
        const save = button('Enregistrer le nom', () => {}); save.type = 'submit';
        form.append(input.box, save, button('Annuler', refresh));
        form.addEventListener('submit', async event => {event.preventDefault(); try {await bank.rename(pose.id, input.input.value); refresh(); say('Pose renommée.');} catch (error) {say(error.message);}});
        details.replaceChildren(form); input.input.focus(); input.input.select();
      };
      actions.append(button('Appliquer', safe(() => {applyPose(editor, pose); say(`Pose « ${pose.name} » appliquée.`);})),
        button('Insérer', safe(() => {editor.importFigure(pose.document); dialog.close('pose');})), button('Renommer', rename),
        button('Retirer', async () => {try {await bank.remove(pose.id); refresh(); say('Pose retirée de la bibliothèque locale.');} catch (e) {say(e.message);}}));
      details.append(title, node('span', 'trait-hint', `${pose.document.figure_types[0].segments.length} segments`), actions);
      row.append(thumbnail(pose), details); list.append(row);
    }
  }
  search.input.addEventListener('input', refresh);
  const save = button('Enregistrer la pose', safe(async () => {await bank.add(capturePose(editor, name.input.value)); search.input.value = ''; refresh(); say('Pose enregistrée dans ce navigateur ou cette application.');}), 'primary'); save.id = 'trait-save-pose';
  const upload = node('input'); upload.type = 'file'; upload.accept = '.json'; upload.hidden = true;
  upload.addEventListener('change', async () => {
    try {const f = upload.files[0]; if (!f) return; if (f.size > 4 * 1024 * 1024) throw new Error('Le fichier dépasse 4 Mo.'); await bank.import(await f.text()); refresh(); say('Bibliothèque importée.');}
    catch (e) {say(e.message);} finally {upload.value = '';}
  });
  toolbar.append(save, button('Exporter les poses', () => download('trait-poses.json', bank.export())), button('Importer', () => upload.click()));
  content.append(intro, name.box, toolbar, search.box, list, upload); refresh();
  if (bank.error) say('La bibliothèque locale n’a pas pu être lue. Exporte une copie avant de la remplacer.');
}
