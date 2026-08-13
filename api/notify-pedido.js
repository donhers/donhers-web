// ============================================================
//  Donher's — Aviso de pedido nuevo a Brandon (por email)
//  Función serverless de Vercel. La web llama acá (WEBHOOK_URL)
//  cuando entra un pedido y mandamos un email vía Resend.
//  Requiere la variable de entorno RESEND_API_KEY en Vercel.
//  Mientras no esté la key, no rompe nada (responde ok:false).
// ============================================================

// A quién le llega el aviso y desde qué dirección sale.
// Configurables por variable de entorno en Vercel, para poder cambiarlos
// sin tocar el código:
//   PEDIDOS_EMAIL_TO    uno o varios mails separados por coma
//   PEDIDOS_EMAIL_FROM  remitente (necesita dominio verificado en Resend)
//
// OJO con el remitente por defecto: mientras se use onboarding@resend.dev,
// Resend SOLO entrega a la dirección con la que se creó la cuenta. Para que
// le llegue a Brandon hay que verificar donhers.com en Resend y poner acá
// algo como "Donher's <pedidos@donhers.com>".
const DESTINO = (process.env.PEDIDOS_EMAIL_TO || "donhers.imp@gmail.com")
  .split(",").map((s) => s.trim()).filter(Boolean);
const REMITENTE = process.env.PEDIDOS_EMAIL_FROM || "Donher's <onboarding@resend.dev>";

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

    // El aviso se arma como notificación transaccional, no como promoción:
    // Gmail lo mandaba a Spam con el diseño anterior (título dorado, emoji en
    // el asunto y botón tipo newsletter eran señales de mailing masivo).
    // Sobrio, con version en texto plano y sin emojis = bandeja de entrada.
    const pago = d.metodo_pago === "transfer" ? "Transferencia" : (d.metodo_pago || "—");
    const datos = [
      ["Pedido", d.id],
      ["Total", money(d.total)],
      ["Productos", d.items],
      ["Cliente", d.email],
      ["Pago", pago],
      ["Envío", d.envio],
      ["Dirección", d.direccion],
    ].filter(([, v]) => v);

    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;color:#222;font-size:14px;line-height:1.5">` +
      `<p>Entró un pedido nuevo en la tienda. Verificá el pago antes de despachar.</p>` +
      `<table style="border-collapse:collapse;font-size:14px;margin:16px 0">` +
      datos.map(([k, v]) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#666">${k}</td>` +
        `<td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`).join("") +
      `</table>` +
      `<p><a href="https://www.donhers.com/admin.html" style="color:#7a5f22">Abrir el panel de pedidos</a></p>` +
      `<p style="color:#888;font-size:12px">Aviso automático de la tienda donhers.com</p>` +
      `</div>`;

    // Los mails que solo llevan HTML puntúan peor en los filtros de spam.
    const texto =
      "Entró un pedido nuevo en la tienda. Verificá el pago antes de despachar.\n\n" +
      datos.map(([k, v]) => k + ": " + v).join("\n") +
      "\n\nPanel de pedidos: https://www.donhers.com/admin.html\n" +
      "Aviso automático de la tienda donhers.com\n";

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: REMITENTE,
        to: DESTINO,
        subject: `Pedido ${d.id || ""} — ${money(d.total)}`,
        html,
        text: texto,
      }),
    });
    const out = await r.json().catch(() => ({}));
    // Si Resend rechaza (dominio sin verificar, key inválida), devolvemos su
    // mensaje: sin esto el aviso fallaba en silencio y no había cómo saber
    // por qué no llegaba el mail.
    if (!r.ok) console.error("[notify-pedido] Resend rechazó el envío:", r.status, out);
    return res.status(200).json({
      ok: r.ok,
      status: r.status,
      id: out.id || null,
      error: r.ok ? null : (out.message || out.name || "error de Resend"),
    });
  } catch (e) {
    // nunca romper el flujo de compra por el aviso
    return res.status(200).json({ ok: false, error: String(e && e.message || e) });
  }
}
