/* ============================================================
   DONHERS — Hero Watch Animation v2
   Gold premium watch — assembled / floating / exploded / back
   ============================================================ */
(function () {
  const canvas = document.getElementById('watch-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ── Palette ───────────────────────────────────────────────
  const G      = '#B99A52';   // aged gold
  const G_SOFT = '#D6BD73';   // soft gold
  const G_DARK = '#7A6030';   // deep gold
  const IVORY  = '#F5EFE3';

  // ── Layout ────────────────────────────────────────────────
  let W, H, CX, CY, R;

  function resize() {
    W  = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H  = canvas.height = canvas.offsetHeight || window.innerHeight;
    CX = W > 768 ? W * 0.67 : W * 0.50;
    CY = W > 768 ? H * 0.50 : H * 0.38;
    R  = Math.max(80, Math.min(170, Math.min(W, H) * 0.23));
  }

  // ── Easing ────────────────────────────────────────────────
  const easeOut  = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const easeIn   = t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10);
  const easeInOut = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
  const lerp     = (a, b, t) => a + (b - a) * t;

  // ── Phase ─────────────────────────────────────────────────
  // 0=ASSEMBLED 1=FLOATING 2=EXPLODED 3=ASSEMBLING
  let phase = 3, phaseT = 0, phaseStart = null;
  const DUR = [5.0, 1.8, 5.5, 2.8];

  // interpT: 0=assembled  0.5=floating  1=exploded
  let interpT = 0;
  // label fade
  let lblA = 0;
  // hand continuous motion
  let sAngle = -Math.PI * 0.5; // second hand
  let lastTS = null;

  // ── Part scatter/explode positions (in R units) ───────────
  // each: { sc: scattered, ex: exploded, lbl, dir }
  const P = {
    strapTop: { sc:{x:-0.3,y:-4.6,r:-18},  ex:{x:0,   y:-3.0,r:0} },
    strapBot: { sc:{x: 0.5,y: 4.8,r: 20},  ex:{x:0,   y: 3.0,r:0} },
    bezel:    { sc:{x:-2.8,y: 0.9,r: 35},  ex:{x:-2.2,y:0,   r:0}, lbl:'BISEL PULIDO',          dir: 1 },
    crystal:  { sc:{x: 2.9,y:-1.3,r:-18},  ex:{x:-3.4,y:0,   r:0}, lbl:'CRISTAL DE ZAFIRO',     dir: 1 },
    movement: { sc:{x:-1.6,y: 2.6,r: 45},  ex:{x: 0.7,y:0,   r:0}, lbl:'MOVIMIENTO AUTOMÁTICO', dir:-1 },
    caseback: { sc:{x: 2.8,y: 1.8,r:-25},  ex:{x: 2.2,y:0,   r:0}, lbl:'CAJA ACERO 316L PVD',   dir: 1 },
    crown:    { sc:{x: 3.8,y:-0.4,r:  0},  ex:{x: 3.5,y: 0.7,r:0}, lbl:'CORONA GRABADA',        dir:-1 },
    dial:     { sc:{x: 1.6,y:-2.4,r:-30},  ex:{x:-0.7,y:0,   r:0}, lbl:'ESFERA SOLEIL',         dir: 1 },
    markers:  { sc:{x:-0.4,y:-3.9,r: 75},  ex:{x:-0.7,y:0,   r:0} },
    hourH:    { sc:{x:-3.4,y: 2.2,r:-135}, ex:{x:-0.7,y:0,   r:0} },
    minuteH:  { sc:{x: 2.1,y: 3.2,r: 65},  ex:{x:-0.7,y:0,   r:0} },
    secondH:  { sc:{x:-3.0,y:-2.8,r:195},  ex:{x:-0.7,y:0,   r:0} },
  };

  // ── Helpers ───────────────────────────────────────────────
  const TAU = Math.PI * 2;

  function save(px, py, rot, alpha, fn) {
    if (alpha <= 0.005) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
    ctx.translate(px, py);
    ctx.rotate(rot);
    fn();
    ctx.restore();
  }

  function rr(x, y, w, h, r) {
    const rc = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rc, y);
    ctx.lineTo(x+w-rc, y);   ctx.arcTo(x+w,y,    x+w,y+rc,   rc);
    ctx.lineTo(x+w, y+h-rc); ctx.arcTo(x+w,y+h,  x+w-rc,y+h, rc);
    ctx.lineTo(x+rc, y+h);   ctx.arcTo(x,  y+h,  x,y+h-rc,   rc);
    ctx.lineTo(x, y+rc);     ctx.arcTo(x,  y,    x+rc,y,      rc);
    ctx.closePath();
  }

  // ── Draw parts ────────────────────────────────────────────

  function drawStrap(px, py, rot, a) {
    const sw = R * 0.60, sh = R * 0.88;
    save(px, py, rot, a, () => {
      rr(-sw/2, -sh/2, sw, sh, R * 0.08);
      const g = ctx.createLinearGradient(-sw/2, 0, sw/2, 0);
      g.addColorStop(0,   '#0B0908'); g.addColorStop(0.2,'#1F1A14');
      g.addColorStop(0.5, '#261F18'); g.addColorStop(0.8,'#1B1610');
      g.addColorStop(1,   '#0B0908');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(185,154,82,.22)'; ctx.lineWidth = 1; ctx.stroke();
      // leather grain
      ctx.strokeStyle = 'rgba(255,255,255,.025)'; ctx.lineWidth = 0.5;
      for (let i = -sh/2+6; i < sh/2; i += 6) {
        ctx.beginPath(); ctx.moveTo(-sw/2+4,i); ctx.lineTo(sw/2-4,i); ctx.stroke();
      }
      // stitching
      ctx.strokeStyle = 'rgba(185,154,82,.16)'; ctx.lineWidth = 0.5;
      ctx.setLineDash([3,4]);
      rr(-sw/2+5, -sh/2+5, sw-10, sh-10, R*.06);
      ctx.stroke(); ctx.setLineDash([]);
    });
  }

  function drawBezel(px, py, rot, a) {
    save(px, py, rot, a, () => {
      // Drop shadow
      ctx.beginPath(); ctx.arc(0, 0, R*1.04, 0, TAU);
      const ds = ctx.createRadialGradient(0,0,R*.6,0,0,R*1.1);
      ds.addColorStop(0,'rgba(0,0,0,0)'); ds.addColorStop(1,'rgba(0,0,0,.55)');
      ctx.fillStyle = ds; ctx.fill();
      // Bezel ring
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
      const bg = ctx.createRadialGradient(-R*.28,-R*.32,0, 0,0,R);
      bg.addColorStop(0,   '#DAC068');
      bg.addColorStop(0.25,'#C4A84E');
      bg.addColorStop(0.55,'#B99A52');
      bg.addColorStop(0.8, '#9A7D35');
      bg.addColorStop(1,   '#7A5E22');
      ctx.fillStyle = bg; ctx.fill();
      // Chamfer highlight
      ctx.beginPath(); ctx.arc(0,0,R*.97,-Math.PI*.78,-Math.PI*.05);
      const ch = ctx.createLinearGradient(
        Math.cos(-Math.PI*.78)*R*.97, Math.sin(-Math.PI*.78)*R*.97,
        Math.cos(-Math.PI*.05)*R*.97, Math.sin(-Math.PI*.05)*R*.97);
      ch.addColorStop(0,'rgba(255,245,190,0)'); ch.addColorStop(.35,'rgba(255,245,190,.55)');
      ch.addColorStop(.7,'rgba(255,245,190,.42)'); ch.addColorStop(1,'rgba(255,245,190,0)');
      ctx.strokeStyle = ch; ctx.lineWidth = R*.052; ctx.stroke();
      // Inner shadow
      ctx.beginPath(); ctx.arc(0,0,R*.87,0,TAU);
      const is = ctx.createRadialGradient(0,0,R*.73,0,0,R*.87);
      is.addColorStop(0,'rgba(0,0,0,.92)'); is.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = is; ctx.fill();
    });
  }

  function drawCaseback(px, py, rot, a) {
    // Similar to bezel but solid (case back)
    save(px, py, rot, a, () => {
      ctx.beginPath(); ctx.arc(0,0,R,0,TAU);
      const g = ctx.createRadialGradient(R*.2,R*.2,0,0,0,R);
      g.addColorStop(0,'#C4A848'); g.addColorStop(.5,'#B09040'); g.addColorStop(1,'#7A5E22');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(185,154,82,.35)'; ctx.lineWidth = 1; ctx.stroke();
      // Engraved DH
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.font = `700 ${R*.55}px 'Cormorant Garamond',serif`;
      ctx.fillText('DH', 0, 2);
      // Outer ring detail
      ctx.beginPath(); ctx.arc(0,0,R*.92,0,TAU);
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = R*.06; ctx.stroke();
    });
  }

  function drawDial(px, py, rot, a) {
    save(px, py, rot, a, () => {
      const dr = R * .855;
      ctx.beginPath(); ctx.arc(0,0,dr,0,TAU);
      const g = ctx.createRadialGradient(0,-dr*.12,0,0,0,dr);
      g.addColorStop(0,'#1D1A15'); g.addColorStop(.45,'#100F0D'); g.addColorStop(1,'#050504');
      ctx.fillStyle = g; ctx.fill();
      // Sunburst lines (very subtle)
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(185,154,82,.035)'; ctx.lineWidth = 1;
      for (let i=0;i<72;i++) {
        const ang = (i/72)*TAU;
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.lineTo(Math.cos(ang)*dr,Math.sin(ang)*dr); ctx.stroke();
      }
      ctx.restore();
      // Brand text
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(185,154,82,.82)';
      ctx.font=`600 ${R*.092}px 'Cormorant Garamond',Georgia,serif`;
      ctx.fillText("DONHER'S",0,-dr*.28);
      ctx.fillStyle='rgba(185,154,82,.40)';
      ctx.font=`300 ${R*.058}px 'DM Sans',system-ui,sans-serif`;
      ctx.fillText('URUGUAY',0,-dr*.15);
      ctx.fillStyle='rgba(185,154,82,.28)';
      ctx.font=`300 ${R*.050}px 'DM Sans',system-ui,sans-serif`;
      ctx.fillText('AUTOMÁTICO',0,dr*.46);
      // Date window at 3
      const dw=R*.18,dh=R*.13,dwx=dr*.58;
      rr(dwx-dw/2,-dh/2,dw,dh,2);
      ctx.fillStyle='rgba(235,230,215,.92)'; ctx.fill();
      ctx.strokeStyle='rgba(185,154,82,.55)'; ctx.lineWidth=.8; ctx.stroke();
      ctx.fillStyle='#0A0908';
      ctx.font=`500 ${R*.075}px 'DM Sans',sans-serif`;
      ctx.fillText('8',dwx,1);
    });
  }

  function drawMarkers(px, py, rot, a) {
    save(px, py, rot, a, () => {
      const dr = R*.855;
      for (let i=0;i<12;i++) {
        if (i===3) continue; // date window
        const ang = (i/12)*TAU - Math.PI/2;
        const big = i%3===0;
        ctx.save();
        ctx.rotate(ang);
        ctx.fillStyle = `rgba(185,154,82,${big?.95:.68})`;
        if (i===0) { // 12: triple bar
          [-R*.036, 0, R*.036].forEach(ox => {
            ctx.fillRect(ox-R*.012,-dr*.93,R*.012*1.2,dr*.18);
          });
        } else {
          ctx.fillRect(-R*(big?.014:.010), -(dr*.93), R*(big?.028:.020), dr*(big?.16:.10));
        }
        ctx.restore();
      }
    });
  }

  function drawHand(px, py, ang, a, len, w, isSecond) {
    save(px, py, 0, a, () => {
      ctx.rotate(ang);
      const tail = R*.12;
      if (isSecond) {
        const slen = R * len;
        ctx.beginPath(); ctx.moveTo(0,tail); ctx.lineTo(0,-slen);
        ctx.strokeStyle=G; ctx.lineWidth=R*.014; ctx.lineCap='round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(0,tail*.5,R*.038,0,TAU);
        ctx.fillStyle=G; ctx.fill();
        return;
      }
      const hlen = R * len, hw = R * w;
      ctx.beginPath();
      ctx.moveTo(0, tail);
      ctx.lineTo(-hw/2, -hlen*.3);
      ctx.lineTo(-hw/3, -hlen*.55);
      ctx.lineTo(0,     -hlen);
      ctx.lineTo( hw/3, -hlen*.55);
      ctx.lineTo( hw/2, -hlen*.3);
      ctx.closePath();
      const g = ctx.createLinearGradient(-hw/2,0,hw/2,0);
      g.addColorStop(0,G_DARK); g.addColorStop(.4,G_SOFT);
      g.addColorStop(.6,G_SOFT); g.addColorStop(1,G_DARK);
      ctx.fillStyle=g; ctx.fill();
    });
  }

  function drawCrown(px, py, rot, a) {
    const cw=R*.13,ch=R*.26;
    save(px, py, rot, a, () => {
      rr(-cw/2,-ch/2,cw,ch,cw*.24);
      const g=ctx.createLinearGradient(-cw/2,0,cw/2,0);
      g.addColorStop(0,'#7A5E22'); g.addColorStop(.25,G);
      g.addColorStop(.5,G_SOFT); g.addColorStop(.75,G); g.addColorStop(1,'#7A5E22');
      ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.2)'; ctx.lineWidth=.8;
      for(let i=-ch/2+5;i<ch/2;i+=5){
        ctx.beginPath(); ctx.moveTo(-cw/2+2,i); ctx.lineTo(cw/2-2,i); ctx.stroke();
      }
    });
  }

  function drawCrystal(px, py, rot, a) {
    save(px, py, rot, a, () => {
      const dr=R*.86;
      ctx.beginPath(); ctx.arc(0,0,dr,0,TAU);
      ctx.fillStyle='rgba(180,210,230,.05)'; ctx.fill();
      ctx.strokeStyle='rgba(185,154,82,.28)'; ctx.lineWidth=1; ctx.stroke();
      // sapphire sheen
      ctx.beginPath(); ctx.arc(0,0,dr*.88,-Math.PI*.76,-Math.PI*.06);
      ctx.strokeStyle='rgba(255,255,255,.22)'; ctx.lineWidth=dr*.065; ctx.stroke();
    });
  }

  function drawMovement(px, py, rot, a) {
    save(px, py, rot, a, () => {
      const mr=R*.83;
      ctx.beginPath(); ctx.arc(0,0,mr,0,TAU);
      const g=ctx.createRadialGradient(0,0,0,0,0,mr);
      g.addColorStop(0,'#2E2822'); g.addColorStop(.7,'#1C1814'); g.addColorStop(1,'#0E0D0A');
      ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle='rgba(185,154,82,.28)'; ctx.lineWidth=1; ctx.stroke();
      // gear teeth
      for(let i=0;i<38;i++){
        const ag=(i/38)*TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ag)*mr*.87,Math.sin(ag)*mr*.87);
        ctx.lineTo(Math.cos(ag)*mr*.98,Math.sin(ag)*mr*.98);
        ctx.strokeStyle='rgba(185,154,82,.18)'; ctx.lineWidth=1.2; ctx.stroke();
      }
      // balance wheel
      ctx.beginPath(); ctx.arc(0,0,mr*.38,0,TAU);
      ctx.strokeStyle='rgba(185,154,82,.25)'; ctx.lineWidth=1.5; ctx.stroke();
      for(let i=0;i<4;i++){
        const ag=(i/4)*TAU;
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.lineTo(Math.cos(ag)*mr*.38,Math.sin(ag)*mr*.38);
        ctx.strokeStyle='rgba(185,154,82,.22)'; ctx.lineWidth=1; ctx.stroke();
      }
      // jewel
      ctx.beginPath(); ctx.arc(0,0,mr*.065,0,TAU);
      ctx.fillStyle='rgba(185,154,82,.55)'; ctx.fill();
      // small text
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(185,154,82,.30)';
      ctx.font=`300 ${R*.048}px 'DM Sans',sans-serif`;
      ctx.fillText('21 JEWELS',0,mr*.62);
    });
  }

  function drawCenter(a) {
    ctx.save(); ctx.globalAlpha=Math.min(1,a); ctx.translate(CX,CY);
    const g=ctx.createRadialGradient(-R*.01,-R*.01,0,0,0,R*.046);
    g.addColorStop(0,G_SOFT); g.addColorStop(.5,G); g.addColorStop(1,G_DARK);
    ctx.beginPath(); ctx.arc(0,0,R*.046,0,TAU);
    ctx.fillStyle=g; ctx.fill();
    ctx.restore();
  }

  // ── Label + dotted line ───────────────────────────────────
  function drawLabel(text, px, py, dir, a) {
    if (a<=.01) return;
    const lineEnd  = py + dir * R * 1.05;
    const textY    = py + dir * R * 1.22;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.setLineDash([2,5]);
    ctx.strokeStyle='rgba(185,154,82,.42)'; ctx.lineWidth=.8;
    ctx.beginPath();
    ctx.moveTo(px, py + dir*R*.5);
    ctx.lineTo(px, lineEnd);
    ctx.stroke();
    ctx.setLineDash([]);
    // Diamond dot at line top
    ctx.fillStyle='rgba(185,154,82,.55)';
    ctx.beginPath(); ctx.arc(px, lineEnd, 2, 0, TAU); ctx.fill();
    ctx.textAlign='center';
    ctx.textBaseline = dir>0 ? 'bottom' : 'top';
    ctx.font=`300 ${R*.052}px 'DM Sans',system-ui,sans-serif`;
    ctx.fillStyle='rgba(185,154,82,.78)';
    ctx.fillText(text, px, textY + (dir>0 ? -4 : 4));
    ctx.restore();
  }

  // ── Position interpolation ────────────────────────────────
  function pos(key) {
    const sc  = P[key].sc;
    const ex  = P[key].ex;
    const as  = {x:0,y:0,r:0};

    let x, y, r;
    if (interpT <= 0.5) {
      const t = easeOut(interpT * 2);
      x = lerp(as.x, sc.x, t) * R;
      y = lerp(as.y, sc.y, t) * R;
      r = lerp(as.r, sc.r, t) * Math.PI/180;
    } else {
      const t = easeOut((interpT-0.5)*2);
      x = lerp(sc.x, ex.x, t) * R;
      y = lerp(sc.y, ex.y, t) * R;
      r = lerp(sc.r, ex.r, t) * Math.PI/180;
    }
    // floating oscillation
    const ff = interpT<=0.5 ? interpT*2 : Math.max(0,1-(interpT-.5)*5);
    if (ff>0) {
      x += Math.sin(Date.now()*.0007 + sc.x*1.5) * R*.022 * ff;
      y += Math.cos(Date.now()*.0009 + sc.y*1.3) * R*.022 * ff;
    }
    return { x: CX+x, y: CY+y, r };
  }

  // ── Main render loop ──────────────────────────────────────
  function draw(ts) {
    if (!phaseStart) { phaseStart=ts; lastTS=ts; }
    const dt = Math.min((ts-lastTS)/1000, .05);
    lastTS = ts;

    const elapsed = (ts-phaseStart)/1000;
    phaseT = Math.min(elapsed/DUR[phase], 1);
    if (phaseT>=1) { phase=(phase+1)%4; phaseStart=ts; phaseT=0; }

    // interpT
    switch(phase) {
      case 0: interpT=0; break; // assembled
      case 1: interpT=easeOut(phaseT)*0.5; break; // floating out
      case 2: interpT=0.5+easeOut(phaseT)*0.5; break; // exploding
      case 3: interpT=1-easeInOut(phaseT); if(interpT<0)interpT=0; break; // assembling
    }

    // label opacity
    lblA = (phase===2) ? Math.min(1, (phaseT-.15)*5) * .88
         : (phase===3) ? Math.max(0, 1-phaseT*5) * .88
         : 0;

    // second hand continuous rotation when assembled
    if (phase===0 || (phase===1&&phaseT<.5)) {
      sAngle += dt * TAU / 60;
    }

    // ── Background ──────────────────────────────────────────
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#030303';
    ctx.fillRect(0,0,W,H);

    // ambient gold glow
    const gR  = R*(2.4+interpT*.9);
    const gA  = .06+(1-interpT)*.07;
    const gg  = ctx.createRadialGradient(CX,CY,0,CX,CY,gR);
    gg.addColorStop(0,`rgba(185,154,82,${gA})`);
    gg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gg; ctx.fillRect(0,0,W,H);

    // ── Compute base alpha ───────────────────────────────────
    const ba = 0.78 + 0.22*(1-interpT*.25);

    // ── Draw parts (back to front) ───────────────────────────

    // Straps
    const st=pos('strapTop'), sb=pos('strapBot');
    drawStrap(st.x,st.y,st.r,ba);
    drawStrap(sb.x,sb.y,sb.r,ba);

    // Caseback (only when exploded)
    if(interpT>.45){
      const cb=pos('caseback'), ea=(interpT-.45)*2;
      drawCaseback(cb.x,cb.y,cb.r,ba*Math.min(1,ea));
      drawLabel(P.caseback.lbl,cb.x,cb.y,P.caseback.dir,lblA);
    }

    // Movement (only when exploded)
    if(interpT>.45){
      const mv=pos('movement'), ea=(interpT-.45)*2;
      drawMovement(mv.x,mv.y,mv.r,ba*Math.min(1,ea));
      drawLabel(P.movement.lbl,mv.x,mv.y,P.movement.dir,lblA);
    }

    // Bezel
    const bz=pos('bezel');
    drawBezel(bz.x,bz.y,bz.r,ba);
    drawLabel(P.bezel.lbl,bz.x,bz.y,P.bezel.dir,lblA);

    // Dial
    const dl=pos('dial');
    drawDial(dl.x,dl.y,dl.r,ba);
    drawLabel(P.dial.lbl,dl.x,dl.y,P.dial.dir,lblA);

    // Markers (track with dial)
    const mk=pos('markers');
    drawMarkers(mk.x,mk.y,mk.r,ba);

    // Hands (fade out as parts scatter)
    const ha=Math.max(0,1-interpT*2.5);
    if(ha>.01){
      drawHand(dl.x,dl.y,-Math.PI/3*.85,ba*ha,.43,.052,false);   // hour
      drawHand(dl.x,dl.y, Math.PI/3*.9, ba*ha,.62,.036,false);   // minute
      drawHand(dl.x,dl.y, sAngle,       ba*ha,.72,0,   true);    // second
    }

    // Crystal (semi-transparent overlay when assembled, visible when exploded)
    const cr=pos('crystal');
    const crA = interpT<.5 ? ba*.35 : ba*(.35+(interpT-.5)*1.3);
    drawCrystal(cr.x,cr.y,cr.r,Math.min(ba,crA));
    drawLabel(P.crystal.lbl,cr.x,cr.y,P.crystal.dir,lblA);

    // Crown
    const cw=pos('crown');
    drawCrown(cw.x,cw.y,cw.r,ba);
    drawLabel(P.crown.lbl,cw.x,cw.y,P.crown.dir,lblA);

    // Center jewel
    if(interpT<.35) drawCenter(ba*(1-interpT/.35));

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', () => { resize(); phaseStart=null; lastTS=null; });
  requestAnimationFrame(draw);
})();
