// ============================================================
//  Donher's — Panel interno (admin)
//  Requiere: supabase-js + js/config.js + js/db.js
// ============================================================
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-UY");
  const fecha = (iso) => { if (!iso) return "—"; const d = new Date(iso); return d.toLocaleDateString("es-UY", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }); };

  const ESTADOS = ["pendiente_pago", "confirmado", "en_preparacion", "enviado", "entregado", "cancelado"];
  const ESTADO_LABEL = { pendiente_pago: "Pendiente de pago", confirmado: "Confirmado", en_preparacion: "En preparación", enviado: "Enviado", entregado: "Entregado", cancelado: "Cancelado" };

  let PRODUCTOS = []; // cache para nombres en stats

  // ---------- AUTH ----------
  async function init() {
    if (!window.DB || !window.DB.ok) { $("login-msg").textContent = "No se pudo conectar con la base."; $("login-msg").className = "msg error"; return; }
    const user = await DB.auth.getUser();
    if (user) mostrarPanel(user); else mostrarLogin();
    DB.auth.onChange((u) => { if (u) mostrarPanel(u); else mostrarLogin(); });
  }

  function mostrarLogin() { $("panel").classList.add("hidden"); $("login-screen").classList.remove("hidden"); }
  async function mostrarPanel(user) {
    // Verificar que la cuenta sea admin (no alcanza con estar logueado)
    if (DB.esAdmin) {
      const ok = await DB.esAdmin();
      if (!ok) {
        await DB.auth.signOut();
        $("login-msg").textContent = "Esta cuenta no tiene acceso al panel interno.";
        $("login-msg").className = "msg error";
        mostrarLogin();
        return;
      }
    }
    $("login-screen").classList.add("hidden");
    $("panel").classList.remove("hidden");
    $("who").textContent = user.email || "";
    cargarSeccion("stats");
  }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("login-btn"), msg = $("login-msg");
    btn.disabled = true; btn.textContent = "Ingresando..."; msg.textContent = "";
    const { data, error } = await DB.auth.signIn($("email").value.trim(), $("password").value);
    btn.disabled = false; btn.textContent = "Ingresar";
    if (error) {
      const m = (error.message || "").toLowerCase();
      let txt = "No se pudo ingresar: " + (error.message || "error desconocido");
      if (m.includes("not confirmed") || m.includes("email")) txt = "El usuario existe pero el email NO está confirmado. En Supabase → Authentication → tu usuario → confirmalo (o recrealo tildando 'Auto Confirm User').";
      else if (m.includes("invalid")) txt = "Email o contraseña incorrectos, o el usuario no existe todavía.";
      msg.textContent = txt; msg.className = "msg error";
    }
    else if (data && data.user) mostrarPanel(data.user);
  });

  $("logout-btn").addEventListener("click", async () => { await DB.auth.signOut(); mostrarLogin(); });

  // ---------- TABS ----------
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    ["stats", "pedidos", "productos", "clientes"].forEach((s) => $("sec-" + s).classList.toggle("hidden", s !== t.dataset.sec));
    cargarSeccion(t.dataset.sec);
  }));

  function cargarSeccion(s) {
    if (s === "stats") renderStats();
    else if (s === "pedidos") renderPedidos();
    else if (s === "productos") renderProductos();
    else if (s === "clientes") renderClientes();
  }

  // ---------- ESTADÍSTICAS ----------
  async function renderStats() {
    const el = $("sec-stats");
    el.innerHTML = '<div class="loading">Cargando métricas…</div>';
    const eventos = await DB.adminEventos();
    if (!PRODUCTOS.length) PRODUCTOS = await DB.adminTodosLosProductos();
    const nombre = (id) => { const p = PRODUCTOS.find((x) => x.id === id); return p ? p.nombre : id; };
    const cont = (tipo) => eventos.filter((e) => e.tipo === tipo).length;

    // top productos por vistas + agregados al carrito
    const porProd = {};
    eventos.forEach((e) => { if (e.producto_id && (e.tipo === "ver_producto" || e.tipo === "add_carrito")) porProd[e.producto_id] = (porProd[e.producto_id] || 0) + 1; });
    const top = Object.entries(porProd).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = top.length ? top[0][1] : 1;

    el.innerHTML =
      '<div class="cards">' +
      stat("Visitas", cont("visita")) +
      stat("Vistas de producto", cont("ver_producto")) +
      stat("Agregados al carrito", cont("add_carrito")) +
      stat("Checkouts", cont("checkout")) +
      stat("Clics a WhatsApp", cont("click_whatsapp")) +
      '</div>' +
      '<div class="card"><div class="card-h">Productos con más interés</div>' +
      (top.length ? '<div class="bars">' + top.map(([id, v]) =>
        '<div class="bar-row"><span class="name">' + esc(nombre(id)) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.round(v / max * 100) + '%"></span></span><span class="val">' + v + '</span></div>'
      ).join("") + '</div>' : '<div class="empty">Todavía no hay datos de interacción.</div>') +
      '</div>';
  }
  const stat = (lbl, num) => '<div class="stat"><div class="lbl">' + lbl + '</div><div class="num">' + num + '</div></div>';

  // ---------- PEDIDOS ----------
  async function renderPedidos() {
    const el = $("sec-pedidos");
    el.innerHTML = '<div class="loading">Cargando pedidos…</div>';
    const pedidos = await DB.adminPedidos();
    if (!pedidos.length) { el.innerHTML = '<div class="card"><div class="empty">Todavía no hay pedidos.</div></div>'; return; }
    el.innerHTML = '<div class="card"><div class="card-h">Pedidos (' + pedidos.length + ')</div>' +
      '<table><thead><tr><th>Fecha</th><th>N°</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Estado</th></tr></thead><tbody>' +
      pedidos.map((p) =>
        '<tr><td>' + fecha(p.creado_en) + '</td><td>' + esc(p.id) + '</td>' +
        '<td>' + esc(p.cliente_nombre || "—") + '<br><span style="color:var(--muted);font-size:12px">' + esc(p.cliente_email || "") + '</span></td>' +
        '<td>' + money(p.total) + '</td><td><span class="pill">' + esc(p.metodo_pago || "—") + '</span></td>' +
        '<td><select class="estado" data-id="' + esc(p.id) + '">' +
        ESTADOS.map((s) => '<option value="' + s + '"' + (s === p.estado ? " selected" : "") + '>' + ESTADO_LABEL[s] + '</option>').join("") +
        '</select></td></tr>'
      ).join("") + '</tbody></table></div>';

    el.querySelectorAll("select.estado").forEach((sel) => sel.addEventListener("change", async () => {
      sel.disabled = true;
      await DB.adminActualizarEstadoPedido(sel.dataset.id, sel.value);
      sel.disabled = false;
    }));
  }

  // ---------- PRODUCTOS ----------
  async function renderProductos() {
    const el = $("sec-productos");
    el.innerHTML = '<div class="loading">Cargando productos…</div>';
    PRODUCTOS = await DB.adminTodosLosProductos();
    const filas = PRODUCTOS.map((p) =>
      '<tr data-id="' + esc(p.id) + '">' +
      '<td>' + esc(p.id) + '</td>' +
      '<td><input class="cell" data-f="nombre" value="' + esc(p.nombre) + '" style="width:160px"></td>' +
      '<td><input class="cell" data-f="precio" type="number" value="' + Number(p.precio) + '" style="width:80px"></td>' +
      '<td><select class="cell" data-f="categoria"><option value="caballeros"' + (p.categoria === "caballeros" ? " selected" : "") + '>Caballeros</option><option value="damas"' + (p.categoria === "damas" ? " selected" : "") + '>Damas</option></select></td>' +
      '<td><input type="checkbox" data-f="activo"' + (p.activo ? " checked" : "") + '></td>' +
      '<td class="row-actions"><button class="mini guardar">Guardar</button><button class="mini del eliminar">×</button></td></tr>'
    ).join("");

    el.innerHTML = '<div class="card"><div class="card-h">Productos (' + PRODUCTOS.length + ')</div>' +
      '<div class="form-grid" id="nuevo-prod">' +
      '<input class="field" id="np-id" placeholder="Código (DON00XX) *" style="margin:0">' +
      '<input class="field" id="np-nombre" placeholder="Nombre *" style="margin:0">' +
      '<input class="field" id="np-precio" type="number" placeholder="Precio" style="margin:0">' +
      '<select class="field" id="np-cat" style="margin:0"><option value="caballeros">Caballeros</option><option value="damas">Damas</option></select>' +
      '<button class="btn" id="np-add" style="width:auto;padding:11px 16px">Agregar</button></div>' +
      '<table><thead><tr><th>Código</th><th>Nombre</th><th>Precio</th><th>Categoría</th><th>Activo</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>';

    // guardar fila
    el.querySelectorAll(".guardar").forEach((b) => b.addEventListener("click", async () => {
      const tr = b.closest("tr"), id = tr.dataset.id;
      const orig = PRODUCTOS.find((x) => x.id === id) || {};
      const upd = Object.assign({}, orig, {
        nombre: tr.querySelector('[data-f="nombre"]').value.trim(),
        precio: parseInt(tr.querySelector('[data-f="precio"]').value, 10) || 0,
        categoria: tr.querySelector('[data-f="categoria"]').value,
        activo: tr.querySelector('[data-f="activo"]').checked,
      });
      b.disabled = true; b.textContent = "…";
      await DB.adminUpsertProducto(upd);
      b.textContent = "✓"; setTimeout(() => { b.textContent = "Guardar"; b.disabled = false; }, 1200);
    }));
    // eliminar
    el.querySelectorAll(".eliminar").forEach((b) => b.addEventListener("click", async () => {
      const tr = b.closest("tr"), id = tr.dataset.id;
      if (!confirm("¿Eliminar el producto " + id + "?")) return;
      await DB.adminEliminarProducto(id); tr.remove();
    }));
    // agregar nuevo
    $("np-add").addEventListener("click", async () => {
      const id = $("np-id").value.trim(), nombre = $("np-nombre").value.trim();
      if (!id || !nombre) { alert("Código y nombre son obligatorios."); return; }
      await DB.adminUpsertProducto({ id, nombre, precio: parseInt($("np-precio").value, 10) || 0, categoria: $("np-cat").value, activo: true, orden: (PRODUCTOS.length + 1) * 10 });
      renderProductos();
    });
  }

  // ---------- CLIENTES ----------
  async function renderClientes() {
    const el = $("sec-clientes");
    el.innerHTML = '<div class="loading">Cargando clientes…</div>';
    const cs = await DB.adminClientes();
    if (!cs.length) { el.innerHTML = '<div class="card"><div class="empty">Todavía no hay clientes registrados.</div></div>'; return; }
    el.innerHTML = '<div class="card"><div class="card-h">Clientes (' + cs.length + ')</div>' +
      '<table><thead><tr><th>Fecha</th><th>Nombre</th><th>Email</th><th>Teléfono</th></tr></thead><tbody>' +
      cs.map((c) => '<tr><td>' + fecha(c.creado_en) + '</td><td>' + esc(c.nombre || "—") + '</td><td>' + esc(c.email || "") + '</td><td>' + esc(c.telefono || "—") + '</td></tr>').join("") +
      '</tbody></table></div>';
  }

  init();
})();
