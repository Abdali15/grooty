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
const WHATSAPP_NUMBER = "51936804577";

const clean = (v) => String(v || "").replace(/\D/g, "");

export const SITE = {
  name: "Grooty Store",
  country: "Perú",
  instagram: "https://www.instagram.com/grootystore10",
  instagramHandle: "@grootystore10",
  whatsappGroup: "https://chat.whatsapp.com/BDxHh2RdsVMLBrIgOUgBVf?s=sh&p=i&mlu=4&ilr=4",
  facebook: "https://www.facebook.com/share/1AZcxL96gg/",
  tiktok: "https://www.tiktok.com/@grooty.store",
  whatsappNumber: clean(import.meta.env.VITE_WHATSAPP_NUMBER) || clean(WHATSAPP_NUMBER),
  announcement: "",
  currency: "PEN",
  // UI only. The server separately authorizes every financial operation.
  paymentsEnabled: import.meta.env.VITE_PAYMENTS_ENABLED === 'true',

  // 2) Logo original optimizado, sin cambiar su composición.
  //    Si el archivo ya incluye el texto "Grooty Store", pon showWordmark en false.
  logo: { src: "/logo.webp", showWordmark: true },

  // 3) Imágenes: usa transformaciones de ImageKit (?tr=w-…,f-auto) para servir
  //    tamaños pequeños y WebP/AVIF. Si algún día cambias de CDN, ponlo en false.
  imageTransforms: true,

  // 4) Figuras del hero (ids de catalog.json). Puedes cambiarlas cuando quieras.
  heroIds: [103, 101, 100, 99, 95],

  // Tráiler enlazado por Disney en su comunicado oficial de agosto de 2026.
  cinema: {
    enabled: true,
    title: "Avengers: Doomsday",
    summary: "Del próximo universo en pantalla a tu próxima pieza en colección. Descubre figuras de personajes de Marvel en nuestro catálogo.",
    videoId: "gcjnEYJ4OB8",
    source: "https://prensa.disney.es/noticias/yadisponibleelnuevotr%C3%A1ilerdevengadores:doomsdaypresentadodurantelad23:theultimatedisneyfanevent",
    query: "Doom"
  },

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
