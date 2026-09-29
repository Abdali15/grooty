/**
 * Configuración central de Grooty Store.
 * Lo único que necesitas editar para publicar: WHATSAPP_NUMBER y (opcional) el logo.
 */

// ─────────────────────────────────────────────────────────────
// 1) WhatsApp: número real con código de país, solo dígitos.
//    Ejemplo de formato: 51987654321
//    También puedes definir VITE_WHATSAPP_NUMBER en Vercel / .env
//    NO se inventa ningún número: si queda vacío, no se abre ningún wa.me.
// ─────────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = "";

const clean = (v) => String(v || "").replace(/\D/g, "");

export const SITE = {
  name: "Grooty Store",
  country: "Perú",
  instagram: "https://www.instagram.com/grootystore10",
  instagramHandle: "@grootystore10",
  whatsappNumber: clean(WHATSAPP_NUMBER) || clean(import.meta.env.VITE_WHATSAPP_NUMBER),
  announcement: "",
  currency: "PEN",

  // 2) Logo real. Copia tu logo original en frontend/public/logo.svg.
  //    Si el archivo ya incluye el texto "Grooty Store", pon showWordmark en false.
  logo: { src: "/logo.svg", showWordmark: true },

  // 3) Imágenes: usa transformaciones de ImageKit (?tr=w-…,f-auto) para servir
  //    tamaños pequeños y WebP/AVIF. Si algún día cambias de CDN, ponlo en false.
  imageTransforms: true,

  // 4) Figuras del hero (ids de catalog.json). Puedes cambiarlas cuando quieras.
  heroIds: [93, 92, 78, 76, 68],

  recentLimit: 12
};

/** Política de preventa: fuente única. Se reutiliza en ficha, drawer, /preventas y /ayuda. */
export const PREORDER_STEPS = [
  "Reserva con el monto indicado.",
  "Cuando el producto llegue a Grooty Store, tienes 7 días calendario para completar el saldo.",
  "Si no se completa dentro del plazo, la reserva se pierde y el monto abonado no es reembolsable."
];

export const PREORDER_POLICY = {
  title: "Cómo funcionan nuestras preventas",
  text: PREORDER_STEPS.join(" ")
};
