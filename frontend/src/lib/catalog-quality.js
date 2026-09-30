/** Recomendaciones para propietarios; no completan ni inventan datos del catálogo. */
export function catalogQualityIssues(product) {
  const issues = [];
  if (!Number.isInteger(product.stock) || product.stock < 0) issues.push('stock');
  for (const [key, label] of [
    ['franchise', 'franquicia'], ['character_name', 'personaje'],
    ['description', 'descripción'], ['includes_text', 'accesorios'], ['box_note', 'caja']
  ]) {
    if (typeof product[key] !== 'string' || !product[key].trim()) issues.push(label);
  }
  if ((product.imagenes_producto || product.images || []).length < 2) issues.push('otra fotografía');
  return issues;
}
