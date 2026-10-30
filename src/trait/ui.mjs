export const node = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
};
export const button = (text, fn, variant = 'outline') => {
  const b = node('button', 'ui-button', text);
  b.type = 'button'; b.dataset.variant = variant; b.addEventListener('click', fn);
  return b;
};
export function field(label, value, type = 'number', attrs = {}) {
  const box = node('label', 'trait-field'), input = node('input', 'ui-input');
  input.type = type; Object.assign(input, attrs); input.value = value;
  box.append(node('span', null, label), input);
  return {box, input};
}
export function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], {type: 'application/json'})), a = node('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
