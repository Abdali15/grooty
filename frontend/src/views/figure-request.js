import { figureRequestPanel, mountFigureRequest } from '../components/figure-request.js';

export const figureRequest = {
  render() {
    return {
      title: 'Figuras a pedido · Grooty Store',
      description: '¿Buscas una figura que no está en el catálogo? Prepara tu consulta para Grooty Store y confirma disponibilidad, precio y plazo.',
      html: `<div class="container request-page"><nav class="crumbs" aria-label="Ruta de navegación"><ol><li><a href="/" data-nav>Inicio</a></li><li aria-current="page">Figuras a pedido</li></ol></nav>${figureRequestPanel({ standalone: true })}</div>`
    };
  },
  mount: mountFigureRequest
};
