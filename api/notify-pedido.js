// ============================================================
//  Donher's — Aviso de pedido nuevo a Brandon (por email)
//  Función serverless de Vercel. La web llama acá (WEBHOOK_URL)
//  cuando entra un pedido y mandamos un email vía Resend.
//  Requiere la variable de entorno RESEND_API_KEY en Vercel.
//  Mientras no esté la key, no rompe nada (responde ok:false).
// ============================================================

const DESTINO = "donhers.imp@gmail.com"; // a dónde le llega el aviso a Brandon
const REMITENTE = "Donher's <onboarding@resend.dev>"; // sin dominio verificado; cambiar a pedidos@donhers.com cuando se verifique

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n) => "$" + Number(n || 0).toLocaleString("es-UY");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method" });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(200).json({ ok: false, skipped: "falta RESEND_API_KEY en Vercel" });

  try {
    const d = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body) || {};
    if (d.type !== "pedido") return res.status(200).json({ ok: true, ignored: true });

    const fila = (k, v) => v ? `<tr><td style="padding:4px 12px 4px 0;color:#888">${k}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>` : "";
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#B99A52;margin-bottom:4px">🛒 Nuevo pedido en Donher's</h2>
        <p style="color:#666;margin-top:0">Entró un pedido. Verificá el pago y gestionalo en el panel.</p>
        <table style="border-collapse:collapse;font-size:14px;margin:14px 0">
          ${fila("Pedido", d.id)}
          ${fila("Total", money(d.total))}
          ${fila("Productos", d.items)}
          ${fila("Cliente", d.email)}
          ${fila("Pago", d.metodo_pago === "transfer" ? "Transferencia" : (d.metodo_pago || "—"))}
          ${fila("Envío", d.envio)}
          ${fila("Dirección", d.direccion)}
        </table>
        <a href="https://donhers.com/admin.html" style="display:inline-block;background:#B99A52;color:#1a1407;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:bold;font-size:13px">Abrir el panel →</a>
      </div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: REMITENTE,
        to: [DESTINO],
        subject: `🛒 Nuevo pedido ${d.id || ""} — ${money(d.total)}`,
        html,
      }),
    });
    const out = await r.json().catch(() => ({}));
    return res.status(200).json({ ok: r.ok, status: r.status, id: out.id || null });
  } catch (e) {
    // nunca romper el flujo de compra por el aviso
    return res.status(200).json({ ok: false, error: String(e && e.message || e) });
  }
}
