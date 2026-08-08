/* ═══════════════════════════════════════════════════════════════
   whiteboard.js — SlateMind v2.2
   Fixes: follow-up board continuity, canvas scroll,
          larger text, cross-browser save, clean resize
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const CHALK = {
  white:'#f0ece0', yellow:'#f4d03f', green:'#58d68d',
  pink:'#f1948a',  blue:'#85c1e9',   orange:'#f0a500',
};
const SPEED = {
  slow:   {char:40, line:26},
  normal: {char:18, line:12},
  fast:   {char:4,  line:2 },
  instant:{char:0,  line:0 },
};
const FC = '"Caveat", cursive';
const FM = '"Share Tech Mono", monospace';
const FS = { heading:36, text:21, bullet:20, equation:23, emphasize:23, label:15, checkpoint:19 };

class Whiteboard {
  constructor(id) {
    this.canvas = document.getElementById(id);
    this.ctx    = this.canvas.getContext('2d');
    this.wrap   = document.getElementById('canvasScrollWrap');

    this._speed   = 'normal';
    this._paused  = false;
    this._writing = false;
    this._abort   = false;

    // Virtual coordinate space
    this.VW     = 880;
    this.margin = 44;
    this.maxW   = this.VW - this.margin * 2;
    this.lineH  = 36;

    // Drawing cursor — persists across lesson + follow-ups
    this.cx = this.margin;
    this.cy = 52;

    this._onBlockDone = null;
    this._onAllDone   = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  /* ── Public API ─────────────────────────────────────────── */

  setSpeed(s)  { this._speed  = SPEED[s] ? s : 'normal'; }
  setPaused(v) { this._paused = v; }
  isWriting()  { return this._writing; }

  /** Full clear — resets cursor to top */
  clear() {
    this._abort   = true;
    this._writing = false;
    this.cx = this.margin;
    this.cy = 52;
    this._setCanvasVH(580);   // reset to default virtual height
    this._clearCanvas();
    if (this.wrap) this.wrap.scrollTop = 0;
    // Allow next render after a tick
    setTimeout(() => { this._abort = false; }, 50);
  }

  /** Render a new lesson from the top */
  async renderLesson(blocks, opts = {}) {
    this._abort       = false;
    this._writing     = true;
    this._onBlockDone = opts.onBlockDone || null;
    this._onAllDone   = opts.onAllDone   || null;

    // Start from top for a new lesson
    this.cx = this.margin;
    this.cy = 52;
    this._ensureHeight();

    for (let i = 0; i < blocks.length; i++) {
      if (this._abort) break;
      await this._waitResume();
      await this._block(blocks[i]);
      this._ensureHeight();
      if (this._onBlockDone) this._onBlockDone(i, blocks[i]);
    }

    this._writing = false;
    if (!this._abort && this._onAllDone) this._onAllDone();
  }

  /**
   * Append follow-up blocks BELOW existing lesson content.
   * cy is intentionally NOT reset — continues where lesson ended.
   */
  async appendBlocks(blocks, opts = {}) {
    this._abort       = false;
    this._writing     = true;
    this._onBlockDone = opts.onBlockDone || null;
    this._onAllDone   = opts.onAllDone   || null;

    // Draw a divider then continue
    this.cy += 20;
    this._drawSeparator();
    this.cy += 28;
    this._ensureHeight();

    for (let i = 0; i < blocks.length; i++) {
      if (this._abort) break;
      await this._waitResume();
      await this._block(blocks[i]);
      this._ensureHeight();
      if (this._onBlockDone) this._onBlockDone(i, blocks[i]);
    }

    this._writing = false;
    if (!this._abort && this._onAllDone) this._onAllDone();
  }

  /* ── Canvas height management ───────────────────────────── */

  /** Expand canvas if cy is approaching the bottom, then scroll */
  _ensureHeight() {
    const s       = this._scale();
    const needPx  = (this.cy + 140) * s;
    if (needPx > this.canvas.height) {
      this._setCanvasVH(this.cy + 320);
    }
    this._scrollFollow();
  }

  /** Set canvas to virtualH virtual units tall, preserving drawn content */
  _setCanvasVH(virtualH) {
    const dpr    = window.devicePixelRatio || 1;
    const s      = this._scale();
    const physH  = Math.ceil(virtualH * s);
    if (physH <= this.canvas.height) return; // never shrink

    // Snapshot existing pixels
    const tmp = document.createElement('canvas');
    tmp.width  = this.canvas.width;
    tmp.height = this.canvas.height;
    tmp.getContext('2d').drawImage(this.canvas, 0, 0);

    // Resize (this clears the canvas)
    this.canvas.height       = physH;
    this.canvas.style.height = Math.ceil(physH / dpr) + 'px';

    // Restore snapshot
    this.ctx.drawImage(tmp, 0, 0);
  }

  /** Smoothly scroll so the current writing position stays visible */
  _scrollFollow() {
    if (!this.wrap) return;
    const s   = this._scale();
    const dpr = window.devicePixelRatio || 1;
    // cy in virtual units → CSS pixels
    const targetPx = Math.max(0, (this.cy - 100) * s / dpr);
    this.wrap.scrollTo({ top: targetPx, behavior: 'smooth' });
  }

  /* ── Block dispatcher ───────────────────────────────────── */

  async _block(b) {
    if (!b || !b.type) return;
    switch (b.type) {
      case 'heading':    return this._heading(b);
      case 'text':       return this._text(b);
      case 'bullet':     return this._bullet(b);
      case 'equation':   return this._equation(b);
      case 'emphasize':  return this._emphasize(b);
      case 'diagram':    return this._diagram(b);
      case 'checkpoint': return this._checkpoint(b);
    }
  }

  /* ── Heading ─────────────────────────────────────────────── */
  async _heading(b) {
    this.cy += 10;
    const s = this._scale(), ctx = this.ctx;
    // Subtle underline before text appears
    ctx.save();
    ctx.strokeStyle = CHALK.yellow;
    ctx.lineWidth   = 2 * s;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(this.cx * s, (this.cy + 44) * s);
    ctx.lineTo((this.cx + this.maxW) * s, (this.cy + 44) * s);
    ctx.stroke();
    ctx.restore();

    await this._write(b.text, this.cx, this.cy, {
      font: `bold ${FS.heading}px ${FC}`, color: CHALK.yellow, glow: true,
    });
    this.cy += 54;
  }

  /* ── Text ─────────────────────────────────────────────────── */
  async _text(b) {
    this.cy += 6;
    for (const line of this._wrap(b.text, FS.text, this.maxW)) {
      if (this._abort) return;
      await this._waitResume();
      await this._write(line, this.cx, this.cy, { font:`${FS.text}px ${FC}`, color:CHALK.white });
      this.cy += this.lineH;
    }
    this.cy += 8;
  }

  /* ── Bullet ─────────────────────────────────────────────── */
  async _bullet(b) {
    this.cy += 6;
    for (const item of (b.items || [])) {
      if (this._abort) return;
      await this._waitResume();
      const s = this._scale(), ctx = this.ctx;
      ctx.save();
      ctx.fillStyle   = CHALK.green;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.arc((this.cx + 5) * s, (this.cy + 8) * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const lines = this._wrap(item, FS.bullet, this.maxW - 22);
      for (let li = 0; li < lines.length; li++) {
        await this._write(lines[li], this.cx + 21, this.cy, {
          font: `${FS.bullet}px ${FC}`, color: CHALK.white,
        });
        if (li < lines.length - 1) this.cy += this.lineH - 4;
      }
      this.cy += this.lineH + 2;
    }
    this.cy += 6;
  }

  /* ── Equation ────────────────────────────────────────────── */
  async _equation(b) {
    this.cy += 12;
    const s = this._scale(), ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = CHALK.green;
    ctx.lineWidth   = 1.5 * s;
    ctx.globalAlpha = 0.38;
    ctx.setLineDash([5 * s, 5 * s]);
    ctx.beginPath();
    ctx.roundRect((this.cx - 12) * s, (this.cy - 10) * s, (this.maxW + 24) * s, 52 * s, 7 * s);
    ctx.stroke();
    ctx.restore();

    await this._write(b.text, this.cx + 12, this.cy + 8, {
      font: `${FS.equation}px ${FM}`, color: CHALK.green, glow: true,
    });
    this.cy += 62;
  }

  /* ── Emphasize ───────────────────────────────────────────── */
  async _emphasize(b) {
    this.cy += 10;
    await this._write(b.text, this.cx, this.cy, {
      font: `bold ${FS.emphasize}px ${FC}`, color: CHALK.pink, glow: true,
    });
    const s     = this._scale(), ctx = this.ctx;
    const textW = this._measure(b.text, FS.emphasize, true) * s;
    const style = b.style || 'underline';
    await this._delay(70);

    ctx.save();
    ctx.strokeStyle = CHALK.pink;
    ctx.lineWidth   = 2.5 * s;
    ctx.globalAlpha = 0.72;

    if (style === 'underline') {
      await this._strokePts(ctx, [
        [this.cx * s, (this.cy + FS.emphasize + 6) * s],
        [(this.cx + textW / s + 14) * s, (this.cy + FS.emphasize + 6) * s],
      ]);
    } else if (style === 'circle') {
      const cx2 = (this.cx + textW / s / 2) * s;
      const cy2 = (this.cy + FS.emphasize / 2) * s;
      await this._ellipse(ctx, cx2, cy2, textW / 2 + 16 * s, (FS.emphasize / 2 + 10) * s);
    } else if (style === 'box') {
      await this._rect(ctx, (this.cx - 8) * s, (this.cy - 4) * s, textW + 16 * s, (FS.emphasize + 14) * s, 6 * s);
    }
    ctx.restore();
    this.cy += FS.emphasize + 24;
  }

  /* ── Checkpoint ──────────────────────────────────────────── */
  async _checkpoint(b) {
    this.cy += 12;
    const s = this._scale(), ctx = this.ctx;
    ctx.save();
    ctx.font      = `${24 * s}px serif`;
    ctx.fillStyle = CHALK.orange;
    ctx.globalAlpha = 0.9;
    ctx.fillText('⚑', this.cx * s, (this.cy + 20) * s);
    ctx.restore();

    await this._write('Checkpoint — Think about it!', this.cx + 34, this.cy, {
      font: `bold ${FS.checkpoint}px ${FC}`, color: CHALK.orange,
    });
    this.cy += 30;
    await this._delay(500);
    if (!this._abort && b.question) {
      window.dispatchEvent(new CustomEvent('wb:checkpoint', {
        detail: { question: b.question, hint: b.hint || '' },
      }));
    }
    this.cy += 8;
  }

  /* ── Diagram ─────────────────────────────────────────────── */
  async _diagram(b) {
    if (!b.shapes?.length) return;
    this.cy += 14;
    const s = this._scale(), ctx = this.ctx, oy = this.cy;

    for (const sh of b.shapes) {
      if (this._abort) return;
      await this._waitResume();
      await this._shape(ctx, sh, s, oy);
    }

    let maxY = 0;
    for (const sh of b.shapes) maxY = Math.max(maxY, (sh.y || 0) + (sh.h || 60));
    this.cy = oy + Math.min(maxY + 28, 220);
  }

  async _shape(ctx, sh, s, oy) {
    const kind = sh.kind || 'box';
    const x = sh.x || 50, y = oy + (sh.y || 20), w = sh.w || 120, h = sh.h || 52;
    const label = sh.label || '';

    ctx.save();
    ctx.strokeStyle = CHALK.blue;
    ctx.fillStyle   = 'rgba(133,193,233,0.055)';
    ctx.lineWidth   = 2.2 * s;
    ctx.globalAlpha = 0.9;

    if (kind === 'box' || kind === 'rect') {
      await this._rect(ctx, x * s, y * s, w * s, h * s, 6 * s);
      ctx.fill();
    } else if (kind === 'circle') {
      await this._ellipse(ctx, (x + w/2)*s, (y + h/2)*s, (w/2)*s, (h/2)*s);
      ctx.fill();
    } else if (kind === 'triangle') {
      await this._strokePts(ctx, [[(x+w/2)*s,y*s],[(x+w)*s,(y+h)*s],[x*s,(y+h)*s],[(x+w/2)*s,y*s]]);
    } else if (kind === 'arrow') {
      const fr = sh.from || [x, y + h/2], to = sh.to || [x + w, y + h/2];
      await this._strokePts(ctx, [[fr[0]*s,(oy+fr[1])*s],[to[0]*s,(oy+to[1])*s]]);
      this._arrowHead(ctx, fr[0]*s,(oy+fr[1])*s, to[0]*s,(oy+to[1])*s, 12*s);
    } else if (kind === 'line') {
      const fr = sh.from || [x,y], to = sh.to || [x+w,y+h];
      await this._strokePts(ctx, [[fr[0]*s,(oy+fr[1])*s],[to[0]*s,(oy+to[1])*s]]);
    }

    if (label) {
      const lx = (kind==='arrow')
        ? ((sh.from?.[0]||x)+(sh.to?.[0]||x+w))/2
        : x + w/2;
      const ly = (kind==='arrow')
        ? oy + ((sh.from?.[1]||y)+(sh.to?.[1]||y))/2 - 10
        : y + h/2;
      ctx.save();
      ctx.font      = `bold ${FS.label * s}px ${FC}`;
      ctx.fillStyle = CHALK.white;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.92;
      ctx.fillText(label, lx * s, (ly + 6) * s);
      ctx.restore();
    }
    ctx.restore();
    await this._delay(70);
  }

  /* ── Core text renderer ─────────────────────────────────── */
  async _write(text, x, y, opts = {}) {
    const ctx   = this.ctx;
    const s     = this._scale();
    const font  = opts.font  || `${FS.text}px ${FC}`;
    const color = opts.color || CHALK.white;
    const delay = SPEED[this._speed].char;

    ctx.save();
    ctx.font         = font;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    if (opts.glow) { ctx.shadowColor = color; ctx.shadowBlur = 3 * s; }

    let drawn = '';
    for (let i = 0; i < text.length; i++) {
      if (this._abort) break;
      await this._waitResume();
      drawn += text[i];

      const mw = ctx.measureText(text).width + 6 * s;
      ctx.clearRect((x - 2) * s, (y - 2) * s, mw, 48 * s);
      ctx.globalAlpha = 0.88 + Math.random() * 0.12;
      ctx.fillStyle   = color;
      ctx.fillText(drawn, (x + (Math.random()-0.5)*0.4) * s, (y + (Math.random()-0.5)*0.4) * s);

      if (delay > 0) await this._delay(delay + Math.random() * 6 - 3);
    }

    // Final clean render
    const mw = ctx.measureText(text).width + 6 * s;
    ctx.clearRect((x-2)*s, (y-2)*s, mw, 48*s);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle   = color;
    ctx.fillText(text, x * s, y * s);
    ctx.restore();

    if (delay > 0) await this._delay(SPEED[this._speed].line);
  }

  /* ── Stroke helpers ─────────────────────────────────────── */
  async _strokePts(ctx, pts) {
    if (pts.length < 2) return;
    const spd = SPEED[this._speed];
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0,y0]=pts[i-1], [x1,y1]=pts[i];
      const dist  = Math.hypot(x1-x0, y1-y0);
      const steps = spd.char===0 ? 1 : Math.max(1, Math.floor(dist/3));
      for (let j = 1; j <= steps; j++) {
        if (this._abort) return;
        await this._waitResume();
        const t = j/steps;
        ctx.lineTo(x0+(x1-x0)*t, y0+(y1-y0)*t);
        ctx.stroke();
        if (spd.char > 0) await this._delay(spd.char/5);
      }
    }
  }

  async _rect(ctx, x, y, w, h, r=0) {
    const pts = r > 0
      ? this._roundPts(x,y,w,h,r)
      : [[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
    await this._strokePts(ctx, pts);
  }

  async _ellipse(ctx, cx, cy, rx, ry) {
    const spd = SPEED[this._speed], steps = spd.char===0?1:64;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      if (this._abort) return;
      await this._waitResume();
      const a = (i/steps)*Math.PI*2;
      const px = cx+rx*Math.cos(a), py = cy+ry*Math.sin(a);
      i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
      ctx.stroke();
      if (spd.char>0) await this._delay(spd.char/4);
    }
  }

  _roundPts(x,y,w,h,r) {
    const pts=[], steps=8;
    [[x+r,y+r,Math.PI,Math.PI*1.5],[x+w-r,y+r,Math.PI*1.5,Math.PI*2],
     [x+w-r,y+h-r,0,Math.PI*.5],[x+r,y+h-r,Math.PI*.5,Math.PI]]
    .forEach(([cx,cy,a0,a1])=>{
      for(let i=0;i<=steps;i++){const a=a0+(a1-a0)*(i/steps);pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
    });
    pts.push(pts[0]); return pts;
  }

  _arrowHead(ctx, x1, y1, x2, y2, size) {
    const a = Math.atan2(y2-y1, x2-x1);
    ctx.save(); ctx.fillStyle=CHALK.blue; ctx.globalAlpha=0.85;
    ctx.beginPath(); ctx.moveTo(x2,y2);
    ctx.lineTo(x2-size*Math.cos(a-Math.PI/6), y2-size*Math.sin(a-Math.PI/6));
    ctx.lineTo(x2-size*Math.cos(a+Math.PI/6), y2-size*Math.sin(a+Math.PI/6));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  /* ── Separator ──────────────────────────────────────────── */
  _drawSeparator() {
    const ctx=this.ctx, s=this._scale();
    ctx.save();
    ctx.strokeStyle='rgba(240,236,224,0.16)';
    ctx.lineWidth=1*s; ctx.setLineDash([7*s,9*s]);
    ctx.beginPath();
    ctx.moveTo(this.cx*s, this.cy*s);
    ctx.lineTo((this.cx+this.maxW)*s, this.cy*s);
    ctx.stroke(); ctx.restore();
  }

  /* ── Canvas / resize ────────────────────────────────────── */
  _resize() {
    const canvas = this.canvas;
    const wrap   = this.wrap || canvas.parentElement;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    const w    = Math.floor(rect.width);
    const visH = Math.max(400, Math.floor(rect.height));

    // Only update width — never shrink height (would erase content)
    const newW = Math.floor(w * dpr);
    if (canvas.width !== newW) {
      // Snapshot content
      const tmp = document.createElement('canvas');
      tmp.width  = canvas.width;
      tmp.height = canvas.height;
      tmp.getContext('2d').drawImage(canvas, 0, 0);

      canvas.width       = newW;
      canvas.style.width = w + 'px';

      // Keep height at least the visible area
      const minH = Math.floor(visH * dpr);
      if (canvas.height < minH) {
        canvas.height       = minH;
        canvas.style.height = visH + 'px';
      }
      this.ctx.drawImage(tmp, 0, 0);
    }
    // Ensure minimum visible height without shrinking
    const minH = Math.floor(visH * dpr);
    if (canvas.height < minH) {
      this._setCanvasVH(visH);
      canvas.style.height = visH + 'px';
    }
  }

  _scale() {
    const dpr = window.devicePixelRatio || 1;
    return (this.canvas.width / dpr) / this.VW;
  }

  _clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /* ── Text helpers ───────────────────────────────────────── */
  _measure(text, size, bold) {
    const ctx=this.ctx; ctx.save();
    ctx.font=`${bold?'bold ':''}${size}px ${FC}`;
    const w=ctx.measureText(text).width/this._scale();
    ctx.restore(); return w;
  }

  _wrap(text, size, maxW) {
    const ctx=this.ctx, s=this._scale();
    ctx.save(); ctx.font=`${size}px ${FC}`;
    const words=text.split(' '), lines=[]; let line='';
    for (const word of words) {
      const test=line?line+' '+word:word;
      if (ctx.measureText(test).width/s>maxW&&line) { lines.push(line); line=word; }
      else line=test;
    }
    if(line)lines.push(line);
    ctx.restore();
    return lines.length?lines:[''];
  }

  /* ── Cross-browser image save ───────────────────────────── */
  saveAsImage() {
    const canvas = this.canvas;
    const name   = `slatmind-${Date.now()}.png`;
    if (canvas.toBlob) {
      canvas.toBlob(blob => {
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url; a.download=name;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } else {
      const a=document.createElement('a');
      a.href=canvas.toDataURL('image/png'); a.download=name; a.click();
    }
  }

  /* ── Async helpers ──────────────────────────────────────── */
  _delay(ms) {
    if (ms<=0) return Promise.resolve();
    return new Promise(resolve=>{
      const start=performance.now();
      const tick=()=>{
        if(this._abort||performance.now()-start>=ms){resolve();return;}
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async _waitResume() {
    while(this._paused&&!this._abort) await this._delay(80);
  }
}

window.Whiteboard = Whiteboard;
