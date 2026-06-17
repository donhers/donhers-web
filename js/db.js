// ============================================================
//  Donher's — Capa de datos sobre Supabase
//  Requiere, cargados ANTES: supabase-js (CDN) + js/config.js
//  Expone window.DB con métodos para productos, pedidos,
//  eventos (métricas) y auth del panel interno.
// ============================================================
(function () {
  const cfg = window.SUPABASE_CONFIG;
  if (!cfg || !window.supabase) {
    console.warn("[DB] Supabase no disponible — la web funciona en modo local.");
    window.DB = { ok: false };
    return;
  }

  const sb = window.supabase.createClient(cfg.url, cfg.key);

  // id anónimo de visitante (para métricas), persistente en el navegador
  function sessionId() {
    let id = localStorage.getItem("dh_sid");
    if (!id) {
      id = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("dh_sid", id);
    }
    return id;
  }

  window.DB = {
    ok: true,
    client: sb,

    // ---------- PRODUCTOS ----------
    async getProductos() {
      const { data, error } = await sb
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("orden", { ascending: true });
      if (error) { console.error("[DB] getProductos", error); return []; }
      return data || [];
    },

    // ---------- PEDIDOS ----------
    // order = { id, cliente_email, cliente_nombre, total, metodo_pago, datos_envio, items:[{producto_id,nombre,precio,qty}] }
    async crearPedido(order) {
      const { error: e1 } = await sb.from("pedidos").insert({
        id: order.id,
        cliente_email: order.cliente_email || null,
        cliente_nombre: order.cliente_nombre || null,
        total: order.total || 0,
        estado: order.estado || "pendiente_pago",
        metodo_pago: order.metodo_pago || null,
        datos_envio: order.datos_envio || null,
      });
      if (e1) { console.error("[DB] crearPedido", e1); return { ok: false, error: e1 }; }

      if (Array.isArray(order.items) && order.items.length) {
        const rows = order.items.map((i) => ({
          pedido_id: order.id,
          producto_id: i.producto_id || i.id || null,
          nombre: i.nombre || i.name,
          precio: i.precio || i.price || 0,
          qty: i.qty || 1,
        }));
        const { error: e2 } = await sb.from("pedido_items").insert(rows);
        if (e2) console.error("[DB] crearPedido items", e2);
      }
      return { ok: true };
    },

    // ---------- SEGUIMIENTO DE PEDIDO (comprador, sin login) ----------
    // Devuelve el estado actual de un pedido si coinciden número + email.
    // Usa una función segura (RPC) que NO expone la tabla de pedidos.
    async estadoPedido(id, email) {
      try {
        const { data, error } = await sb.rpc("seguimiento_pedido", { p_id: id, p_email: email });
        if (error || !data || !data.length) return null;
        return data[0]; // { id, estado, total, creado_en, actualizado_en }
      } catch (e) { return null; }
    },

    // ---------- EVENTOS (métricas) ----------
    async track(tipo, extra = {}) {
      try {
        await sb.from("eventos").insert({
          tipo,
          producto_id: extra.producto_id || null,
          session_id: sessionId(),
          path: location.pathname,
          meta: extra.meta || null,
        });
      } catch (e) { /* silencioso: métricas nunca rompen la web */ }
    },

    // ---------- AUTH (panel interno) ----------
    auth: {
      async signIn(email, password) {
        return await sb.auth.signInWithPassword({ email, password });
      },
      async signUp(email, password, meta) {
        return await sb.auth.signUp({ email, password, options: { data: meta || {} } });
      },
      async signOut() { return await sb.auth.signOut(); },
      async getUser() { const { data } = await sb.auth.getUser(); return data?.user || null; },
      onChange(cb) { return sb.auth.onAuthStateChange((_e, session) => cb(session?.user || null)); },
    },

    // Registrar un comprador en la tabla clientes (insert público por RLS).
    async crearCliente(c) {
      try { await sb.from("clientes").insert({ email: c.email, nombre: c.nombre || null, telefono: c.telefono || null }); }
      catch (e) { /* no rompe el registro */ }
    },

    // ¿El usuario logueado tiene acceso al panel? (solo emails de la tabla admins)
    async esAdmin() {
      try { const { data, error } = await sb.rpc("es_admin"); return !error && data === true; }
      catch (e) { return false; }
    },

    // ---------- ADMIN (requieren sesión logueada Y ser admin; RLS lo exige) ----------
    async adminPedidos() {
      const { data, error } = await sb.from("pedidos").select("*").order("creado_en", { ascending: false });
      if (error) { console.error("[DB] adminPedidos", error); return []; }
      return data || [];
    },
    async adminActualizarEstadoPedido(id, estado) {
      return await sb.from("pedidos").update({ estado, actualizado_en: new Date().toISOString() }).eq("id", id);
    },
    async adminClientes() {
      const { data, error } = await sb.from("clientes").select("*").order("creado_en", { ascending: false });
      if (error) { console.error("[DB] adminClientes", error); return []; }
      return data || [];
    },
    async adminEventos(desdeISO) {
      let q = sb.from("eventos").select("*").order("creado_en", { ascending: false }).limit(5000);
      if (desdeISO) q = q.gte("creado_en", desdeISO);
      const { data, error } = await q;
      if (error) { console.error("[DB] adminEventos", error); return []; }
      return data || [];
    },
    // CRUD de productos (panel)
    async adminUpsertProducto(p) {
      return await sb.from("productos").upsert(p);
    },
    // Sube una foto al bucket "productos" y devuelve la URL pública.
    async subirImagenProducto(file, id) {
      try {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = id + "-" + Date.now() + "." + ext;
        const { error } = await sb.storage.from("productos").upload(path, file, { upsert: true, cacheControl: "3600" });
        if (error) { console.error("[DB] subirImagen", error); return null; }
        const { data } = sb.storage.from("productos").getPublicUrl(path);
        return (data && data.publicUrl) || null;
      } catch (e) { console.error("[DB] subirImagen", e); return null; }
    },
    async adminEliminarProducto(id) {
      return await sb.from("productos").delete().eq("id", id);
    },
    async adminTodosLosProductos() {
      const { data, error } = await sb.from("productos").select("*").order("orden", { ascending: true });
      if (error) { console.error("[DB] adminTodosLosProductos", error); return []; }
      return data || [];
    },
  };
})();
