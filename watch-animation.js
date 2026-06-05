/* ============================================================
   DONHERS — Watch Assembly / Disassembly Hero Animation
   Canvas-based. Pure CSS/JS, no dependencies.
   ============================================================ */
(function () {
  const canvas = document.getElementById('watch-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const GOLD       = '#C9A84C';
  const GOLD_DARK  = '#9A7A32';
  const GOLD_LIGHT = '#E8D080';
  const SILVER_HI  = '#EEEEEE';
  const SILVER_MID = '#AAAAAA';

  // ── Layout ──────────────────────────────────────────────────
  let W, H, CX, CY, R;

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
    CX = W > 768 ? W * 0.68 : W * 0.50;
    CY = W > 768 ? H * 0.50 : H * 0.36;
    R  = Math.max(80, Math.min(160, Math.min(W, H) * 0.22));
  }

  // ── Easing ──────────────────────────────────────────────────
  const easeOutExpo  = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const easeInExpo   = t => t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  const lerp         = (a, b, t) => a + (b - a) * t;

  // ── Phase machine ───────────────────────────────────────────
  const PHASES = { ASSEMBLING: 0, ASSEMBLED: 1, DISASSEMBLING: 2, SCATTERED: 3 };
  const DURATIONS = { 0: 2.8, 1: 3.5, 2: 1.8, 3: 1.2 };

  let phase = PHASES.ASSEMBLING;
  let phaseStart = null;
  let phaseT = 0;          // 0-1 within current phase
  let interpT = 0;         // 0 = fully scattered, 1 = fully assembled

  // Continuous second hand angle (radians, driven by timestamp)
  let secondAngle = Math.PI / 2; // start pointing down-right

  // ── Part descriptors ────────────────────────────────────────
  // scOff / asOff = scattered / assembled offset in R units from watch center
  // scRot / asRot = scattered / assembled rotation in degrees
  const PART_DEFS = [
    { id: 'strap-top',    scOff: { x: -0.4, y: -4.8 }, scRot: -28,  asOff: { x: 0,    y: -(1.03 + 0.82) }, asRot: 0   },
    { id: 'strap-bot',    scOff: { x:  0.7, y:  5.0 }, scRot:  22,  asOff: { x: 0,    y:  (1.03 + 0.82) }, asRot: 0   },
    { id: 'case',         scOff: { x: -2.6, y:  0.9 }, scRot:  50,  asOff: { x: 0,    y:  0              }, asRot: 0   },
    { id: 'dial',         scOff: { x:  2.4, y: -0.7 }, scRot: -65,  asOff: { x: 0,    y:  0              }, asRot: 0   },
    { id: 'markers',      scOff: { x: -1.9, y: -2.6 }, scRot:  95,  asOff: { x: 0,    y:  0              }, asRot: 0   },
    { id: 'crown',        scOff: { x:  3.6, y:  0.4 }, scRot:  10,  asOff: { x: 1.06, y:  0              }, asRot: 0   },
    { id: 'hour-hand',    scOff: { x: -3.2, y:  2.4 }, scRot: -130, asOff: { x: 0,    y:  0              }, asRot: -60 },
    { id: 'minute-hand',  scOff: { x:  1.6, y:  3.6 }, scRot:  70,  asOff: { x: 0,    y:  0              }, asRot:  60 },
    { id: 'second-hand',  scOff: { x:  3.2, y: -3.1 }, scRot:  185, asOff: { x: 0,    y:  0              }, asRot:  90 },
    { id: 'crystal',      scOff: { x:  0.4, y: -3.6 }, scRot: -18,  asOff: { x: 0,    y:  0              }, asRot: 0   },
  ];

  // ── Draw helpers ─────────────────────────────────────────────

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function withPart(px, py, rot, alpha, fn) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(px, py);
    ctx.rotate(rot * Math.PI / 180);
    fn();
    ctx.restore();
  }

  // Strap (top or bottom)
  function drawStrap(px, py, rot, alpha) {
    const sw = R * 0.68, sh = R * 0.82, rr = R * 0.09;
    withPart(px, py, rot, alpha, () => {
      roundRect(ctx, -sw / 2, -sh / 2, sw, sh, rr);
      const g = ctx.createLinearGradient(-sw / 2, 0, sw / 2, 0);
      g.addColorStop(0,   '#191919');
      g.addColorStop(0.3, '#282828');
      g.addColorStop(0.7, '#222222');
      g.addColorStop(1,   '#141414');
      ctx.fillStyle = g;
      ctx.fill();
      // gold border
      ctx.strokeStyle = 'rgba(201,168,76,0.28)';
      ctx.lineWidth   = 1;
      ctx.stroke();
      // subtle horizontal texture
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth   = 0.6;
      for (let i = -sh / 2 + 7; i < sh / 2; i += 7) {
        ctx.beginPath();
        ctx.moveTo(-sw / 2 + 5, i);
        ctx.lineTo( sw / 2 - 5, i);
        ctx.stroke();
      }
    });
  }

  // Outer bezel ring
  function drawCase(px, py, rot, alpha) {
    withPart(px, py, rot, alpha, () => {
      // Drop shadow / ambient glow
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2);
      const shadow = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.1);
      shadow.addColorStop(0, 'rgba(0,0,0,0)');
      shadow.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = shadow;
      ctx.fill();

      // Bezel body
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.05, 0, 0, R);
      g.addColorStop(0,   '#D4AF5C');
      g.addColorStop(0.35,'#C9A84C');
      g.addColorStop(0.65,'#A88838');
      g.addColorStop(1,   '#7A5E22');
      ctx.fillStyle = g;
      ctx.fill();

      // Bezel highlight arc
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.97, -Math.PI * 0.72, -Math.PI * 0.08);
      ctx.strokeStyle = 'rgba(255,235,140,0.45)';
      ctx.lineWidth   = R * 0.045;
      ctx.stroke();

      // Inner shadow ring separating bezel from dial
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.87, 0, Math.PI * 2);
      const inner = ctx.createRadialGradient(0, 0, R * 0.74, 0, 0, R * 0.87);
      inner.addColorStop(0, 'rgba(0,0,0,0.85)');
      inner.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = inner;
      ctx.fill();
    });
  }

  // Dial face
  function drawDial(px, py, rot, alpha) {
    withPart(px, py, rot, alpha, () => {
      const dr = R * 0.84;
      ctx.beginPath();
      ctx.arc(0, 0, dr, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(0, -dr * 0.15, 0, 0, 0, dr);
      g.addColorStop(0,   '#1C1C1C');
      g.addColorStop(0.55,'#121212');
      g.addColorStop(1,   '#080808');
      ctx.fillStyle = g;
      ctx.fill();

      // Subtle sunburst texture lines
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(201,168,76,0.035)';
      ctx.lineWidth   = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 30) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * dr, Math.sin(a) * dr);
        ctx.stroke();
      }
      ctx.restore();

      // Brand name
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = 'rgba(201,168,76,0.75)';
      ctx.font         = `500 ${R * 0.095}px 'Cormorant Garamond', Georgia, serif`;
      ctx.fillText("DONHER'S", 0, -dr * 0.26);

      ctx.fillStyle = 'rgba(201,168,76,0.38)';
      ctx.font      = `300 ${R * 0.062}px 'DM Sans', sans-serif`;
      ctx.fillText('URUGUAY', 0, -dr * 0.13);
    });
  }

  // Hour markers
  function drawMarkers(px, py, rot, alpha) {
    withPart(px, py, rot, alpha, () => {
      const dr = R * 0.84;
      for (let i = 0; i < 12; i++) {
        const a   = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const big = i % 3 === 0;
        const r1  = dr * 0.93;
        const r2  = big ? dr * 0.78 : dr * 0.85;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
        ctx.strokeStyle = big ? 'rgba(201,168,76,0.92)' : 'rgba(201,168,76,0.48)';
        ctx.lineWidth   = big ? R * 0.028 : R * 0.014;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }
    });
  }

  // Crown (winder button)
  function drawCrown(px, py, rot, alpha) {
    const cw = R * 0.13, ch = R * 0.24, rr = cw * 0.28;
    withPart(px, py, rot, alpha, () => {
      roundRect(ctx, -cw / 2, -ch / 2, cw, ch, rr);
      const g = ctx.createLinearGradient(-cw / 2, 0, cw / 2, 0);
      g.addColorStop(0,   '#7A5E22');
      g.addColorStop(0.3, '#C9A84C');
      g.addColorStop(0.7, '#D4AF5C');
      g.addColorStop(1,   '#9A7A32');
      ctx.fillStyle = g;
      ctx.fill();
      // knurling
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth   = 0.8;
      for (let i = -ch / 2 + 4; i < ch / 2; i += 5) {
        ctx.beginPath();
        ctx.moveTo(-cw / 2 + 1.5, i);
        ctx.lineTo( cw / 2 - 1.5, i);
        ctx.stroke();
      }
    });
  }

  // Hour hand
  function drawHourHand(px, py, rot, alpha) {
    const len = R * 0.44, tail = R * 0.12, w = R * 0.054;
    withPart(px, py, rot, alpha, () => {
      ctx.beginPath();
      ctx.moveTo(-w / 2,      tail);
      ctx.lineTo(-w / 3,     -len * 0.55);
      ctx.lineTo(0,          -len);
      ctx.lineTo( w / 3,     -len * 0.55);
      ctx.lineTo( w / 2,      tail);
      ctx.closePath();
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0,   '#777');
      g.addColorStop(0.5, SILVER_HI);
      g.addColorStop(1,   '#777');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth   = 0.5;
      ctx.stroke();
    });
  }

  // Minute hand
  function drawMinuteHand(px, py, rot, alpha) {
    const len = R * 0.62, tail = R * 0.14, w = R * 0.034;
    withPart(px, py, rot, alpha, () => {
      ctx.beginPath();
      ctx.moveTo(-w / 2,      tail);
      ctx.lineTo(-w / 3,     -len * 0.55);
      ctx.lineTo(0,          -len);
      ctx.lineTo( w / 3,     -len * 0.55);
      ctx.lineTo( w / 2,      tail);
      ctx.closePath();
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0,   '#666');
      g.addColorStop(0.5, '#DDDDDD');
      g.addColorStop(1,   '#666');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth   = 0.5;
      ctx.stroke();
    });
  }

  // Second hand (gold, continuously rotating when assembled)
  function drawSecondHand(px, py, rot, alpha) {
    const len = R * 0.70, tail = R * 0.22;
    withPart(px, py, 0, alpha, () => {
      // Use rot as radians directly for the second hand rotation
      ctx.rotate(rot);
      // Needle
      ctx.beginPath();
      ctx.moveTo(0,  tail);
      ctx.lineTo(0, -len);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth   = R * 0.016;
      ctx.lineCap     = 'round';
      ctx.stroke();
      // Counterweight disc
      ctx.beginPath();
      ctx.arc(0, tail * 0.55, R * 0.036, 0, Math.PI * 2);
      ctx.fillStyle = GOLD;
      ctx.fill();
    });
  }

  // Crystal highlight (sapphire-glass sheen)
  function drawCrystal(px, py, rot, alpha) {
    withPart(px, py, rot, alpha * 0.65, () => {
      const dr = R * 0.84;
      ctx.beginPath();
      ctx.arc(0, 0, dr * 0.88, -Math.PI * 0.72, -Math.PI * 0.10);
      const g = ctx.createLinearGradient(
        Math.cos(-Math.PI * 0.72) * dr * 0.88,
        Math.sin(-Math.PI * 0.72) * dr * 0.88,
        Math.cos(-Math.PI * 0.10) * dr * 0.88,
        Math.sin(-Math.PI * 0.10) * dr * 0.88
      );
      g.addColorStop(0,   'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.14)');
      g.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth   = dr * 0.065;
      ctx.stroke();
    });
  }

  // Center jewel
  function drawCenter(alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CX, CY);
    const g = ctx.createRadialGradient(-R * 0.008, -R * 0.008, 0, 0, 0, R * 0.042);
    g.addColorStop(0, GOLD_LIGHT);
    g.addColorStop(0.5, GOLD);
    g.addColorStop(1,   GOLD_DARK);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.042, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  // ── Main loop ────────────────────────────────────────────────
  function tick(ts) {
    if (!phaseStart) phaseStart = ts;
    const elapsed = (ts - phaseStart) / 1000;
    const duration = DURATIONS[phase];
    phaseT = Math.min(elapsed / duration, 1);

    // Phase transitions
    if (phaseT >= 1) {
      phase = (phase + 1) % 4;
      phaseStart = ts;
      phaseT = 0;
    }

    // Compute interpT (0 = scattered, 1 = assembled)
    if      (phase === PHASES.ASSEMBLING)    interpT = easeOutExpo(phaseT);
    else if (phase === PHASES.ASSEMBLED)     interpT = 1;
    else if (phase === PHASES.DISASSEMBLING) interpT = 1 - easeInExpo(phaseT);
    else                                     interpT = 0;

    // Second hand: only spins when assembled/disassembling
    if (phase === PHASES.ASSEMBLED) {
      secondAngle += (Math.PI * 2) / (DURATIONS[PHASES.ASSEMBLED] * 60) * 3;
    }

    // ── Clear + background ──────────────────────────────────────
    ctx.clearRect(0, 0, W, H);

    // Dark bg with warm radial glow at watch center
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, W, H);

    const glowOpacity = 0.06 + interpT * 0.08;
    const glow = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 2.8);
    glow.addColorStop(0, `rgba(201,168,76,${glowOpacity})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ── Draw order: back → front ──────────────────────────────
    const defs = PART_DEFS;

    function partPos(def) {
      return {
        x:   CX + lerp(def.scOff.x, def.asOff.x, interpT) * R,
        y:   CY + lerp(def.scOff.y, def.asOff.y, interpT) * R,
        rot:      lerp(def.scRot,   def.asRot,    interpT),
      };
    }

    // Scattered parts: subtle float oscillation
    function floatOsc(def, ts) {
      if (interpT > 0.85) return { dx: 0, dy: 0 };
      const f = 1 - interpT;
      return {
        dx: Math.sin(ts * 0.0007 + def.scOff.x * 1.3) * R * 0.04 * f,
        dy: Math.cos(ts * 0.0009 + def.scOff.y * 1.1) * R * 0.04 * f,
      };
    }

    // Part alpha: fade in during assembly
    const baseAlpha = 0.72 + 0.28 * interpT;

    function pDraw(id, fn) {
      const def = defs.find(d => d.id === id);
      const p = partPos(def);
      const osc = floatOsc(def, ts);
      fn(p.x + osc.dx, p.y + osc.dy, p.rot, baseAlpha);
    }

    pDraw('strap-top',   drawStrap);
    pDraw('strap-bot',   drawStrap);
    pDraw('case',        drawCase);
    pDraw('dial',        drawDial);
    pDraw('markers',     drawMarkers);
    pDraw('crown',       drawCrown);
    pDraw('hour-hand',   drawHourHand);
    pDraw('minute-hand', drawMinuteHand);

    // Second hand: use continuous angle when assembled, interpolate otherwise
    {
      const def = defs.find(d => d.id === 'second-hand');
      const p   = partPos(def);
      const osc = floatOsc(def, ts);
      const scatteredAngle = def.scRot * Math.PI / 180;
      // When assembling/assembled, rotate continuously; when scattered, use scattered angle
      const targetAngle = secondAngle;
      const rot = lerp(scatteredAngle, targetAngle, interpT);
      drawSecondHand(p.x + osc.dx, p.y + osc.dy, rot, baseAlpha);
    }

    pDraw('crystal', drawCrystal);

    // Center jewel — appears as parts converge
    if (interpT > 0.45) {
      drawCenter(Math.min((interpT - 0.45) / 0.3, 1) * baseAlpha);
    }

    requestAnimationFrame(tick);
  }

  // ── Init ─────────────────────────────────────────────────────
  resize();
  window.addEventListener('resize', () => {
    resize();
    phaseStart = null; // reset timing on resize
  });

  requestAnimationFrame(tick);
})();
