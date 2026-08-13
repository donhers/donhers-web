// ============================================================
//  Donher's — Router de URLs
//  La web es una sola página con modales, así que la barra de
//  direcciones nunca cambiaba. Sin URLs distintas, Google Ads no
//  puede medir una conversión ni mandar tráfico a un producto
//  puntual. Este router le da una URL propia a cada pantalla,
//  sin dejar de ser una sola página (no recarga nada).
//
//  Rutas:
//    /                         inicio
//    /tienda                   la galería de modelos
//    /producto/DON0016-...     detalle de un modelo
//    /carrito                  carrito
//    /checkout                 finalizar compra
//    /gracias/DH-1234          compra confirmada  ← la de conversión
//    /ingresar                 login / crear cuenta
//    /mis-pedidos              pedidos del comprador
//    /resena                   dejar una reseña
//
//  Requiere el rewrite de vercel.json: sin él, entrar directo a
//  /producto/... da 404 porque el archivo no existe en el server.
// ============================================================
window.Router = (function () {
  'use strict';

  // Modal ↔ ruta. El detalle de producto se arma aparte (lleva el código).
  const MODALES = {
    'login-overlay':    { path: '/ingresar',    titulo: 'Ingresar' },
    'orders-overlay':   { path: '/mis-pedidos', titulo: 'Mis pedidos' },
    'checkout-overlay': { path: '/checkout',    titulo: 'Finalizar compra' },
    'resena-overlay':   { path: '/resena',      titulo: 'Dejá tu reseña' },
  };

  const TITULO_BASE = "Donher´s — Relojería Clásica Uruguay";

  // Handlers que registra main.js (ahí viven las funciones que abren cosas).
  let app = {};

  // Cuando el router es el que abre algo, los hooks no deben volver a
  // empujar la URL: se entraría en un ida y vuelta infinito.
  let aplicando = false;

  function esRuta(path, prefijo) {
    return path === prefijo || path.indexOf(prefijo + '/') === 0;
  }

  // /producto/DON0016-rectangular-azul → DON0016
  // El código nunca lleva guiones, así que alcanza con cortar en el primero.
  function codigoDeRuta(path) {
    const resto = path.replace(/^\/producto\/?/, '');
    if (!resto) return null;
    return decodeURIComponent(resto.split('-')[0]).toUpperCase();
  }

  function slug(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Si mañana instalan el tag de Google Ads / Analytics, esto ya le avisa
  // de cada pantalla. Mientras no exista gtag, no hace nada.
  function avisarAnalytics(path, titulo) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: titulo,
        page_location: location.origin + path,
      });
    } catch (e) { /* nunca romper la web por analytics */ }
  }

  return {
    // Ruta pública de un producto, para links y para el push de URL.
    rutaProducto(p) {
      if (!p) return '/tienda';
      const s = slug(p.nombre);
      return '/producto/' + encodeURIComponent(p.id) + (s ? '-' + s : '');
    },

    rutaDeModal(id) {
      return MODALES[id] ? MODALES[id].path : null;
    },

    // Empuja la URL de un modal con su título. Si el modal no tiene ruta
    // propia (no está en la tabla), no toca la barra de direcciones.
    irAModal(id) {
      const m = MODALES[id];
      if (!m) return;
      this.ir(m.path, { titulo: m.titulo });
    },

    // Cambia la URL sin recargar. reemplazar=true no agrega entrada al
    // historial (para no ensuciar el botón Atrás).
    ir(path, opts) {
      opts = opts || {};
      if (aplicando) return;
      const titulo = opts.titulo ? opts.titulo + ' · Donher´s' : TITULO_BASE;
      if (location.pathname === path && !opts.forzar) return;
      try {
        history[opts.reemplazar ? 'replaceState' : 'pushState']({ path }, '', path);
      } catch (e) { return; } // file:// u origen raro: seguimos sin URLs
      document.title = titulo;
      avisarAnalytics(path, titulo);
    },

    // Volver a la raíz al cerrar una pantalla, salvo que haya otra abierta.
    volverABase() {
      if (aplicando) return;
      const otro = document.querySelector('.modal-overlay.active');
      if (otro && this.rutaDeModal(otro.id)) return;         // queda otro modal
      if (document.querySelector('.cart-sidebar.open')) return; // queda el carrito
      const enTienda = location.pathname !== '/' && location.pathname !== '';
      if (enTienda) this.ir('/', { reemplazar: true });
    },

    // La pantalla de compra confirmada: la URL que mide Google Ads.
    confirmarCompra(pedidoId, datos) {
      this.ir('/gracias/' + encodeURIComponent(pedidoId), { titulo: 'Compra confirmada' });
      if (typeof window.gtag === 'function') {
        try {
          window.gtag('event', 'purchase', {
            transaction_id: pedidoId,
            value: (datos && datos.total) || 0,
            currency: 'UYU',
          });
        } catch (e) { /* no romper la confirmación por el tag */ }
      }
    },

    // Abre lo que corresponda a una URL. Se usa al entrar directo por
    // un anuncio y al apretar Atrás/Adelante del navegador.
    resolver(path) {
      // Si la ruta no se puede abrir (producto dado de baja, link viejo),
      // acá anotamos a dónde corregir la URL. Se aplica al final, con el
      // flag ya liberado: si no, ir() se ignora a sí mismo.
      let corregirA = null;
      aplicando = true;
      try {
        if (app.cerrarTodo) app.cerrarTodo();

        if (esRuta(path, '/producto')) {
          const id = codigoDeRuta(path);
          const abrio = id && app.abrirProducto && app.abrirProducto(id);
          if (!abrio) {
            if (app.irATienda) app.irATienda();
            corregirA = '/tienda';
          }
          return;
        }
        if (path === '/carrito')  { if (app.abrirCarrito) app.abrirCarrito(); return; }
        if (path === '/checkout') { if (app.abrirCheckout) app.abrirCheckout(); return; }
        if (path === '/tienda')   { if (app.irATienda) app.irATienda(); return; }

        for (const id in MODALES) {
          if (MODALES[id].path === path) { if (app.abrirModal) app.abrirModal(id); return; }
        }
        // '/', '/gracias/...' y cualquier otra: inicio.
        // /gracias no se puede reabrir después (el pedido ya no está en pantalla).
        if (esRuta(path, '/gracias') && app.irAInicio) app.irAInicio();
      } finally {
        aplicando = false;
        if (corregirA) this.ir(corregirA, { reemplazar: true, titulo: 'Colección' });
      }
    },

    aplicandoRuta() { return aplicando; },

    // main.js registra acá cómo abrir cada cosa y arranca el router.
    iniciar(handlers) {
      app = handlers || {};

      window.addEventListener('popstate', () => {
        this.resolver(location.pathname);
        document.title = TITULO_BASE;
      });

      const inicial = location.pathname;
      // Al entrar directo a /gracias/... no hay pedido que mostrar: home.
      if (esRuta(inicial, '/gracias')) {
        this.ir('/', { reemplazar: true });
        return;
      }
      if (inicial && inicial !== '/' && inicial !== '/index.html') {
        this.resolver(inicial);
      }
    },
  };
})();
