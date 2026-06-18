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

  // ---------- COMISIÓN GENIDEIA (15%) ----------
  // Se calcula solo sobre pedidos con pago confirmado (no pendientes ni cancelados).
  const COMISION = 0.15;
  function comisionHTML(pedidos) {
    const pagados = pedidos.filter((p) => p.estado !== "pendiente_pago" && p.estado !== "cancelado");
    const ventasTotal = pagados.reduce((s, p) => s + Number(p.total || 0), 0);
    const comisionTotal = Math.round(ventasTotal * COMISION);
    // agrupar por mes (YYYY-MM)
    const porMes = {};
    pagados.forEach((p) => {
      const d = new Date(p.creado_en);
      const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      if (!porMes[k]) porMes[k] = { ventas: 0, n: 0, label: d.toLocaleDateString("es-UY", { month: "long" }) + " " + d.getFullYear() };
      porMes[k].ventas += Number(p.total || 0);
      porMes[k].n += 1;
    });
    const meses = Object.entries(porMes).sort((a, b) => b[0].localeCompare(a[0]));
    const filas = meses.map(([k, m]) =>
      '<tr><td style="text-transform:capitalize">' + esc(m.label) + '</td><td>' + m.n + '</td><td>' + money(m.ventas) + '</td><td style="color:var(--gold-soft);font-weight:600">' + money(Math.round(m.ventas * COMISION)) + '</td></tr>'
    ).join("");
    return '<div class="card" style="border:1px solid var(--gold)">' +
      '<div class="card-h">Comisión GENIDEIA (15%) <span style="font-size:12px;color:var(--muted);font-family:\'DM Sans\',sans-serif;font-weight:400">· sobre pedidos con pago confirmado</span></div>' +
      '<div class="cards" style="margin-bottom:14px">' +
      '<div class="stat"><div class="lbl">Ventas confirmadas</div><div class="num">' + money(ventasTotal) + '</div></div>' +
      '<div class="stat" style="border-color:var(--gold)"><div class="lbl">Comisión total a transferir</div><div class="num" style="color:var(--gold-soft)">' + money(comisionTotal) + '</div></div>' +
      '<div class="stat"><div class="lbl">Pedidos pagados</div><div class="num">' + pagados.length + '</div></div>' +
      '</div>' +
      (meses.length
        ? '<table><thead><tr><th>Mes</th><th>Pedidos</th><th>Ventas</th><th>Comisión 15%</th></tr></thead><tbody>' + filas + '</tbody></table>'
        : '<div class="empty">Todavía no hay pagos confirmados para calcular la comisión.</div>') +
      '</div>';
  }

  // ---------- ESTADÍSTICAS ----------
  async function renderStats() {
    const el = $("sec-stats");
    el.innerHTML = '<div class="loading">Cargando métricas…</div>';
    const eventos = await DB.adminEventos();
    const pedidos = await DB.adminPedidos();
    if (!PRODUCTOS.length) PRODUCTOS = await DB.adminTodosLosProductos();
    const nombre = (id) => { const p = PRODUCTOS.find((x) => x.id === id); return p ? p.nombre : id; };
    const cont = (tipo) => eventos.filter((e) => e.tipo === tipo).length;

    // top productos por vistas + agregados al carrito
    const porProd = {};
    eventos.forEach((e) => { if (e.producto_id && (e.tipo === "ver_producto" || e.tipo === "add_carrito")) porProd[e.producto_id] = (porProd[e.producto_id] || 0) + 1; });
    const top = Object.entries(porProd).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = top.length ? top[0][1] : 1;

    el.innerHTML =
      comisionHTML(pedidos) +
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
      '<td><input class="cell" data-f="id" value="' + esc(p.id) + '" style="width:96px;font-family:monospace"></td>' +
      '<td class="foto-cell">' + (p.img_url ? '<img src="' + esc(p.img_url) + '" alt="" style="width:38px;height:38px;object-fit:cover;border-radius:6px;display:block">' : '<span style="color:var(--muted)">sin foto</span>') +
        '<label class="mini" style="cursor:pointer;margin-top:5px;display:inline-block">Subir<input type="file" accept="image/*" class="foto-input" style="display:none"></label></td>' +
      '<td><input class="cell" data-f="nombre" value="' + esc(p.nombre) + '" style="width:160px"></td>' +
      '<td><input class="cell" data-f="precio" type="number" value="' + Number(p.precio) + '" style="width:80px"></td>' +
      '<td><select class="cell" data-f="categoria"><option value="caballeros"' + (p.categoria === "caballeros" ? " selected" : "") + '>Caballeros</option><option value="damas"' + (p.categoria === "damas" ? " selected" : "") + '>Damas</option></select></td>' +
      '<td><input type="checkbox" data-f="activo"' + (p.activo ? " checked" : "") + '></td>' +
      '<td class="row-actions"><button class="mini guardar">Guardar</button><button class="mini del eliminar">×</button></td></tr>'
    ).join("");

    el.innerHTML = '<div class="card"><div class="card-h">Productos (' + PRODUCTOS.length + ') <span style="font-size:12px;color:var(--muted);font-family:\'DM Sans\',sans-serif;font-weight:400">· editá cualquier dato (código, precio, nombre, categoría) y tocá Guardar</span></div>' +
      '<div class="form-grid" id="nuevo-prod">' +
      '<input class="field" id="np-id" placeholder="Código (DON00XX) *" style="margin:0">' +
      '<input class="field" id="np-nombre" placeholder="Nombre *" style="margin:0">' +
      '<input class="field" id="np-precio" type="number" placeholder="Precio" style="margin:0">' +
      '<select class="field" id="np-cat" style="margin:0"><option value="caballeros">Caballeros</option><option value="damas">Damas</option></select>' +
      '<button class="btn" id="np-add" style="width:auto;padding:11px 16px">Agregar</button></div>' +
      '<table><thead><tr><th>Código</th><th>Foto</th><th>Nombre</th><th>Precio</th><th>Categoría</th><th>Activo</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>';

    // guardar fila
    el.querySelectorAll(".guardar").forEach((b) => b.addEventListener("click", async () => {
      const tr = b.closest("tr"), idOrig = tr.dataset.id;
      const orig = PRODUCTOS.find((x) => x.id === idOrig) || {};
      const idNuevo = tr.querySelector('[data-f="id"]').value.trim();
      if (!idNuevo) { alert("El código no puede quedar vacío."); return; }
      b.disabled = true; b.textContent = "…";
      // si cambió el código (clave primaria), renombrarlo antes de guardar el resto
      if (idNuevo !== idOrig) {
        const r = await DB.adminCambiarCodigo(idOrig, idNuevo);
        if (r && r.error) {
          b.disabled = false; b.textContent = "Guardar";
          alert(r.error.code === "23505"
            ? "Ya existe un producto con el código " + idNuevo + ". Elegí otro."
            : "No se pudo cambiar el código: " + r.error.message);
          return;
        }
      }
      const upd = Object.assign({}, orig, {
        id: idNuevo,
        nombre: tr.querySelector('[data-f="nombre"]').value.trim(),
        precio: parseInt(tr.querySelector('[data-f="precio"]').value, 10) || 0,
        categoria: tr.querySelector('[data-f="categoria"]').value,
        activo: tr.querySelector('[data-f="activo"]').checked,
      });
      await DB.adminUpsertProducto(upd);
      // reflejar el código nuevo en la fila y en memoria, para sucesivos guardados
      tr.dataset.id = idNuevo;
      const idx = PRODUCTOS.findIndex((x) => x.id === idOrig);
      if (idx >= 0) PRODUCTOS[idx] = upd;
      b.textContent = "✓"; setTimeout(() => { b.textContent = "Guardar"; b.disabled = false; }, 1200);
    }));
    // eliminar
    el.querySelectorAll(".eliminar").forEach((b) => b.addEventListener("click", async () => {
      const tr = b.closest("tr"), id = tr.dataset.id;
      if (!confirm("¿Eliminar el producto " + id + "?")) return;
      await DB.adminEliminarProducto(id); tr.remove();
    }));
    // subir foto de un producto
    el.querySelectorAll(".foto-input").forEach((inp) => inp.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const tr = inp.closest("tr"), id = tr.dataset.id, label = inp.closest("label");
      label.firstChild.textContent = "Subiendo…";
      const url = await DB.subirImagenProducto(file, id);
      if (!url) { label.firstChild.textContent = "Error al subir"; return; }
      const prod = PRODUCTOS.find((x) => x.id === id) || {};
      await DB.adminUpsertProducto(Object.assign({}, prod, { img_url: url }));
      renderProductos();
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
