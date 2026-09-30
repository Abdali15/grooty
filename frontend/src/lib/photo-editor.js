/** Conserva todas las URLs; escoger portada solo cambia su orden. */
export function imageLines(text) {
  return String(text || '').split('\n').map(url => url.trim()).filter(Boolean);
}
export function selectCover(text, index) {
  const urls = imageLines(text);
  if (!Number.isInteger(index) || index < 0 || index >= urls.length) throw new Error('Selecciona una fotografía de la lista.');
  const [cover] = urls.splice(index, 1);
  return [cover, ...urls].join('\n');
}
