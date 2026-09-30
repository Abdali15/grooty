const s = (body, extra = "") =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}>${body}</svg>`;

export const icons = {
  settings: s('<path d="m9 3-1 3-3 1v4l-2 1 2 1v4l3 1 1 3h6l1-3 3-1v-4l2-1-2-1V7l-3-1-1-3H9Z"/><circle cx="12" cy="12" r="3"/>'),
  search: s('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  heart: s('<path class="heart-shape" d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>'),
  bag: s('<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  home: s('<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  grid: s('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'),
  tag: s('<path d="M20 13 11 22l-9-9V4h9l9 9Z"/><circle cx="7.5" cy="9.5" r="1.5"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  minus: s('<path d="M5 12h14"/>'),
  check: s('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  close: s('<path d="m6 6 12 12M18 6 6 18"/>'),
  arrow: s('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  arrowLeft: s('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  chevron: s('<path d="m6 9 6 6 6-6"/>'),
  eye: s('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/>'),
  sliders: s('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  pause: s('<path d="M8 5v14M16 5v14"/>'),
  play: s('<path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor"/>'),
  share: s('<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="m8.1 10.8 7.8-3.6M8.1 13.2l7.8 3.6"/>'),
  copy: s('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  dice: s('<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  trash: s('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  whatsapp: s('<path d="M3.5 20.5 5 15.6A8.5 8.5 0 1 1 8.6 19l-5.1 1.5Z"/><path d="M9 8.6c.3 2.7 2.7 5.2 5.8 6.1.6.2 1.6-.7 1.6-1.2 0-.3-1.6-1-1.9-1-.3 0-.6.7-.9.7-.6 0-2-1.4-2.1-2-.1-.3.6-.5.6-.8 0-.3-.7-1.9-1-1.9-.5 0-1.5.9-1.4 1.6Z" stroke-width="1.4"/>'),
  instagram: s('<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r=".8" fill="currentColor"/>'),
  external: s('<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>'),
  zoom: s('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4M11 8.5v5M8.5 11h5"/>')
};
