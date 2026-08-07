/* ═══════════════════════════════════════════════════════════════
   whiteboard.js  — Canvas engine  |  SlateMind v2.1
   Fixes: scrolling canvas, larger text, better save, pen tip
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Constants ───────────────────────────────────────────────── */
const CHALK_COLORS = {
  white:  '#f0ece0',
  yellow: '#f4d03f',
  green:  '#58d68d',
  pink:   '#f1948a',
  blue:   '#85c1e9',
  orange: '#f0a500',
};

const SPEED_MAP = {
  slow:    { char: 42, line: 28 },
  normal:  { char: 20, line: 14 },
  fast:    { char: 5,  line: 3  },
  instant: { char: 0,  line: 0  },
};

const FONT_CHALK = '"Caveat", cursive';
const FONT_MONO  = '"Share Tech Mono", monospace';

// Larger font sizes for better readability on screen
const FONT_SIZES = {
  heading:   38,
  text:      22,
  bullet:    21,
  equation:  24,
  emphasize: 24,
  checkpoint:20,
  label:     16,
};

/* ── Whiteboard Class ────────────────────────────────────────── */
class Whiteboard {
  constructor(canvasId) {
    this.canvas     = document.getElementById(canvasId);
    this.ctx        = this.canvas.getContext('2d');
    this.scrollWrap = document.getElementById('canvasScrollWrap');

    this._speed      = 'normal';
    this._paused     = false;
    this._writing    = false;
    this._abort      = false;

    // Virtual coordinate system
    this.VW      = 900;   // virtual width
    this.margin  = 48;
    this.maxW    = this.VW - this.margin * 2;
    this.lineH   = 38;

    // Drawing cursor
    this.cx = this.margin;
    this.cy = 56;

    // Pen tip
    this._penX = 0;
    this._penY = 0;
    this._penVisible = false;

    this._onBlockDone = null;
    this._onAllDone   = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  /* ── Public API ─────────────────────────────────────────── */

  setSpeed(s)  { this._speed = SPEED_MAP[s] ? s : 'normal'; }
  setPaused(v) { this._paused = v; }
  isWriting()  { return this._writing; }

  clear() {
    this._abort    = true;
    this._writing  = false;
    this._penVisible = false;
    this.cx = this.margin;
    this.cy = 56;
    this._setCanvasHeight(600); // reset to default height
    this._clearCanvas();
    if (this.scrollWrap) this.scrollWrap.scrollTop = 0;
  }

  async renderLesson(blocks, opts = {}) {
    this._abort       = false;
    this._writing     = true;
    this._onBlockDone = opts.onBlockDone || null;
    this._onAllDone   = opts.onAllDone   || null;

    this.cx = this.margin;
    this.cy = 56;

    for (let i = 0; i < blocks.length; i++) {
      if (this._abort) break;
      await this._waitUnpaused();
      await this._renderBlock(blocks[i]);
      this._ensureCanvasHeight();
      if (this._onBlockDone) this._onBlockDone(i, blocks[i]);
    }

    this._writing    = false;
    this._penVisible = false;
    if (!this._abort && this._onAllDone) this._onAllDone();
  }

  async appendBlocks(blocks, opts = {}) {
    this._abort       = false;
    this._writing     = true;
    this._onBlockDone = opts.onBlockDone || null;
    this._onAllDone   = opts.onAllDone   || null;

    this.cy += 24;
    this._drawSeparator();
    this.cy += 30;

    for (let i = 0; i < blocks.length; i++) {
      if (this._abort) break;
      await this._waitUnpaused();
      await this._renderBlock(blocks[i]);
      this._ensureCanvasHeight();
      if (this._onBlockDone) this._onBlockDone(i, blocks[i]);
    }

    this._writing    = false;
    this._penVisible = false;
    if (!this._abort && this._onAllDone) this._onAllDone();
  }

  /* ── Canvas height management (scrolling) ───────────────── */

  _ensureCanvasHeight() {
    const s         = this._scale();
    const neededPx  = (this.cy + 120) * s;
    const currentH  = this.canvas.height;
    if (neededPx > currentH) {
      this._setCanvasHeight(Math.ceil((this.cy + 300)));
    }
    // Auto-scroll to follow writing
    this._scrollToBottom();
  }

  _setCanvasHeight(virtualH) {
    const dpr = window.devicePixelRatio || 1;
    const s   = this._scale();
    const physH = Math.ceil(virtualH * s);
    // Preserve existing drawing
    const tmp = document.createElement('canvas');
    tmp.width  = this.canvas.width;
    tmp.height = this.canvas.height;
    tmp.getContext('2d').drawImage(this.canvas, 0, 0);

    this.canvas.height      = physH;
    this.canvas.style.height = (physH / dpr) + 'px';

    // Restore drawing
    this.ctx.drawImage(tmp, 0, 0);
  }

  _scrollToBottom() {
    if (!this.scrollWrap) return;
    const s   = this._scale();
    const top = Math.max(0, (this.cy - 80) * s / (window.devicePixelRatio || 1));
    this.scrollWrap.scrollTo({ top, behavior: 'smooth' });
  }

  /* ── Block Dispatcher ───────────────────────────────────── */

  async _renderBlock(block) {
    const t = block.type;
    if (t === 'heading')    return this._renderHeading(block);
    if (t === 'text')       return this._renderText(block);
    if (t === 'bullet')     return this._renderBullet(block);
    if (t === 'equation')   return this._renderEquation(block);
    if (t === 'diagram')    return this._renderDiagram(block);
    if (t === 'emphasize')  return this._renderEmphasize(block);
    if (t === 'checkpoint') return this._renderCheckpoint(block);
  }

  /* ── Heading ─────────────────────────────────────────────── */
  async _renderHeading(block) {
    this.cy += 10;
    const s   = this._scale();
    const ctx = this.ctx;
    // Subtle underline before text
    ctx.save();
    ctx.strokeStyle = CHALK_COLORS.yellow;
    ctx.lineWidth   = 2 * s;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(this.cx * s, (this.cy + 46) * s);
    ctx.lineTo((this.cx + this.maxW) * s, (this.cy + 46) * s);
    ctx.stroke();
    ctx.restore();

    await this._drawChalkText(block.text, this.cx, this.cy, {
      font:   `bold ${FONT_SIZES.heading}px ${FONT_CHALK}`,
      color:  CHALK_COLORS.yellow,
      shadow: true,
    });
    this.cy += 56;
  }

  /* ── Text ───────────────────────────────────────────────── */
  async _renderText(block) {
    this.cy += 6;
    const lines = this._wrapText(block.text, FONT_SIZES.text, this.maxW);
    for (const line of lines) {
      if (this._abort) return;
      await this._waitUnpaused();
      await this._drawChalkText(line, this.cx, this.cy, {
        font:  `${FONT_SIZES.text}px ${FONT_CHALK}`,
        color: CHALK_COLORS.white,
      });
      this.cy += this.lineH;
    }
    this.cy += 8;
  }

  /* ── Bullet ─────────────────────────────────────────────── */
  async _renderBullet(block) {
    this.cy += 6;
    for (const item of (block.items || [])) {
      if (this._abort) return;
      await this._waitUnpaused();

      const s   = this._scale();
      const ctx = this.ctx;
      // Bullet dot
      ctx.save();
      ctx.fillStyle   = CHALK_COLORS.green;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc((this.cx + 5) * s, (this.cy + 8) * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const lines = this._wrapText(item, FONT_SIZES.bullet, this.maxW - 24);
      for (let li = 0; li < lines.length; li++) {
        await this._drawChalkText(lines[li], this.cx + 22, this.cy, {
          font:  `${FONT_SIZES.bullet}px ${FONT_CHALK}`,
          color: CHALK_COLORS.white,
          maxW:  this.maxW - 24,
        });
        if (li < lines.length - 1) this.cy += this.lineH - 4;
      }
      this.cy += this.lineH + 2;
    }
    this.cy += 6;
  }

  /* ── Equation ───────────────────────────────────────────── */
  async _renderEquation(block) {
    this.cy += 12;
    const s   = this._scale();
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = CHALK_COLORS.green;
    ctx.lineWidth   = 1.5 * s;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([5 * s, 5 * s]);
    const bx = (this.cx - 12) * s;
    const by = (this.cy - 10) * s;
    const bw = (this.maxW + 24) * s;
    const bh = 52 * s;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 7 * s);
    ctx.stroke();
    ctx.restore();

    await this._drawChalkText(block.text, this.cx + 12, this.cy + 8, {
      font:       `${FONT_SIZES.equation}px ${FONT_MONO}`,
      color:      CHALK_COLORS.green,
      shadow:     true,
      charByChar: true,
    });
    this.cy += 60;
  }

  /* ── Emphasize ──────────────────────────────────────────── */
  async _renderEmphasize(block) {
    this.cy += 10;
    await this._drawChalkText(block.text, this.cx, this.cy, {
      font:   `bold ${FONT_SIZES.emphasize}px ${FONT_CHALK}`,
      color:  CHALK_COLORS.pink,
      shadow: true,
    });

    const s      = this._scale();
    const ctx    = this.ctx;
    const textW  = this._measureText(block.text, FONT_SIZES.emphasize, true) * s;
    const style  = block.style || 'underline';

    await this._delay(80);
    ctx.save();
    ctx.strokeStyle = CHALK_COLORS.pink;
    ctx.lineWidth   = 2.5 * s;
    ctx.globalAlpha = 0.75;

    if (style === 'underline') {
      await this._strokeAnimate(ctx, [
        [this.cx * s, (this.cy + FONT_SIZES.emphasize + 6) * s],
        [(this.cx + textW / s + 12) * s, (this.cy + FONT_SIZES.emphasize + 6) * s],
      ]);
    } else if (style === 'circle') {
      const cx2 = (this.cx + textW / s / 2) * s;
      const cy2 = (this.cy + FONT_SIZES.emphasize / 2) * s;
      await this._strokeEllipseAnimate(ctx, cx2, cy2, textW / 2 + 16 * s, (FONT_SIZES.emphasize / 2 + 10) * s);
    } else if (style === 'box') {
      await this._strokeRectAnimate(ctx,
        (this.cx - 8) * s, (this.cy - 4) * s,
        textW + 16 * s, (FONT_SIZES.emphasize + 14) * s, 6 * s
      );
    }
    ctx.restore();
    this.cy += FONT_SIZES.emphasize + 22;
  }

  /* ── Checkpoint ─────────────────────────────────────────── */
  async _renderCheckpoint(block) {
    this.cy += 12;
    const s   = this._scale();
    const ctx = this.ctx;

    ctx.save();
    ctx.font      = `${26 * s}px serif`;
    ctx.fillStyle = CHALK_COLORS.orange;
    ctx.globalAlpha = 0.9;
    ctx.fillText('⚑', this.cx * s, (this.cy + 20) * s);
    ctx.restore();

    await this._drawChalkText('Checkpoint — Think about it!', this.cx + 36, this.cy, {
      font:  `bold ${FONT_SIZES.checkpoint}px ${FONT_CHALK}`,
      color: CHALK_COLORS.orange,
    });
    this.cy += 30;

    await this._delay(600);
    if (!this._abort && block.question) {
      window.dispatchEvent(new CustomEvent('wb:checkpoint', {
        detail: { question: block.question, hint: block.hint || '' },
      }));
    }
    this.cy += 8;
  }

  /* ── Diagram ────────────────────────────────────────────── */
  async _renderDiagram(block) {
    if (!block.shapes || !block.shapes.length) return;
    this.cy += 14;
    const s        = this._scale();
    const ctx      = this.ctx;
    const offsetY  = this.cy;

    for (const shape of block.shapes) {
      if (this._abort) return;
      await this._waitUnpaused();
      await this._drawShape(ctx, shape, s, offsetY);
    }

    let maxY = 0;
    for (const sh of block.shapes) {
      const bottom = (sh.y || 0) + (sh.h || 60);
      if (bottom > maxY) maxY = bottom;
    }
    this.cy = offsetY + Math.min(maxY + 28, 220);
  }

  async _drawShape(ctx, sh, s, offsetY) {
    const kind  = sh.kind  || 'box';
    const x     = sh.x     || 50;
    const y     = offsetY + (sh.y || 20);
    const w     = sh.w     || 120;
    const h     = sh.h     || 52;
    const label = sh.label || '';

    ctx.save();
    ctx.strokeStyle = CHALK_COLORS.blue;
    ctx.fillStyle   = 'rgba(133,193,233,0.06)';
    ctx.lineWidth   = 2.2 * s;
    ctx.globalAlpha = 0.9;

    if (kind === 'box' || kind === 'rect') {
      await this._strokeRectAnimate(ctx, x * s, y * s, w * s, h * s, 6 * s);
      ctx.fill();
    } else if (kind === 'circle') {
      const cx2 = (x + w / 2) * s, cy2 = (y + h / 2) * s;
      await this._strokeEllipseAnimate(ctx, cx2, cy2, (w / 2) * s, (h / 2) * s);
      ctx.fill();
    } else if (kind === 'triangle') {
      await this._strokeAnimate(ctx, [
        [(x + w / 2) * s, y * s],
        [(x + w) * s, (y + h) * s],
        [x * s, (y + h) * s],
        [(x + w / 2) * s, y * s],
      ]);
    } else if (kind === 'arrow') {
      const from = sh.from || [x, y + h / 2];
      const to   = sh.to   || [x + w, y + h / 2];
      await this._strokeAnimate(ctx, [
        [from[0] * s, (offsetY + from[1]) * s],
        [to[0]   * s, (offsetY + to[1])   * s],
      ]);
      this._drawArrowHead(ctx, from[0] * s, (offsetY + from[1]) * s,
                                to[0]   * s, (offsetY + to[1])   * s, 12 * s);
    } else if (kind === 'line') {
      const from = sh.from || [x, y];
      const to   = sh.to   || [x + w, y + h];
      await this._strokeAnimate(ctx, [
        [from[0] * s, (offsetY + from[1]) * s],
        [to[0]   * s, (offsetY + to[1])   * s],
      ]);
    }

    // Label
    if (label) {
      let lx, ly;
      if (kind === 'arrow') {
        lx = ((sh.from?.[0] || x) + (sh.to?.[0] || x + w)) / 2;
        ly = offsetY + ((sh.from?.[1] || y) + (sh.to?.[1] || y)) / 2 - 10;
      } else {
        lx = x + w / 2;
        ly = y + h / 2;
      }
      ctx.save();
      ctx.font      = `bold ${FONT_SIZES.label * s}px ${FONT_CHALK}`;
      ctx.fillStyle = CHALK_COLORS.white;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.95;
      ctx.fillText(label, lx * s, (ly + 6) * s);
      ctx.restore();
    }

    ctx.restore();
    await this._delay(80);
  }

  /* ── Core Text Renderer ─────────────────────────────────── */
  async _drawChalkText(text, x, y, opts = {}) {
    const ctx   = this.ctx;
    const s     = this._scale();
    const font  = opts.font  || `${FONT_SIZES.text}px ${FONT_CHALK}`;
    const color = opts.color || CHALK_COLORS.white;
    const delay = SPEED_MAP[this._speed].char;

    ctx.save();
    ctx.font         = font;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    if (opts.shadow) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 4 * s;
    }

    let drawn = '';
    for (let i = 0; i < text.length; i++) {
      if (this._abort) break;
      await this._waitUnpaused();
      drawn += text[i];

      // Clear region and redraw
      const measW = ctx.measureText(text).width + 4 * s;
      ctx.clearRect((x - 2) * s, (y - 2) * s, measW + 4 * s, 48 * s);

      ctx.globalAlpha = 0.88 + Math.random() * 0.12;
      ctx.fillStyle   = color;
      const jx = (Math.random() - 0.5) * 0.5;
      const jy = (Math.random() - 0.5) * 0.5;
      ctx.fillText(drawn, (x + jx) * s, (y + jy) * s);

      // Update pen tip
      this._penX      = x * s + ctx.measureText(drawn).width;
      this._penY      = y * s;
      this._penVisible = true;

      if (delay > 0) await this._delay(delay + Math.random() * 8 - 4);
    }

    // Final clean render
    const measW = ctx.measureText(text).width + 4 * s;
    ctx.clearRect((x - 2) * s, (y - 2) * s, measW + 4 * s, 48 * s);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle   = color;
    ctx.fillText(text, x * s, y * s);

    this._penVisible = false;
    ctx.restore();

    if (delay > 0) await this._delay(SPEED_MAP[this._speed].line);
  }

  /* ── Stroke Helpers ─────────────────────────────────────── */
  async _strokeAnimate(ctx, points) {
    if (points.length < 2) return;
    const speed = SPEED_MAP[this._speed];
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const dist  = Math.hypot(x1 - x0, y1 - y0);
      const steps = speed.char === 0 ? 1 : Math.max(1, Math.floor(dist / 3));
      for (let j = 1; j <= steps; j++) {
        if (this._abort) return;
        await this._waitUnpaused();
        const t  = j / steps;
        ctx.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
        ctx.stroke();
        if (speed.char > 0) await this._delay(speed.char / 5);
      }
    }
  }

  async _strokeRectAnimate(ctx, x, y, w, h, r = 0) {
    const pts = r > 0
      ? this._roundRectPts(x, y, w, h, r)
      : [[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
    await this._strokeAnimate(ctx, pts);
  }

  async _strokeEllipseAnimate(ctx, cx, cy, rx, ry) {
    const speed = SPEED_MAP[this._speed];
    const steps = speed.char === 0 ? 1 : 64;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      if (this._abort) return;
      await this._waitUnpaused();
      const a  = (i / steps) * Math.PI * 2;
      const px = cx + rx * Math.cos(a);
      const py = cy + ry * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      ctx.stroke();
      if (speed.char > 0) await this._delay(speed.char / 4);
    }
  }

  _roundRectPts(x, y, w, h, r) {
    const pts = [], steps = 8;
    const corners = [
      [x+r,   y+r,   Math.PI,       Math.PI*1.5],
      [x+w-r, y+r,   Math.PI*1.5,   Math.PI*2  ],
      [x+w-r, y+h-r, 0,             Math.PI*0.5],
      [x+r,   y+h-r, Math.PI*0.5,   Math.PI    ],
    ];
    for (const [cx, cy, a0, a1] of corners) {
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (a1 - a0) * (i / steps);
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
    }
    pts.push(pts[0]);
    return pts;
  }

  _drawArrowHead(ctx, x1, y1, x2, y2, size) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.fillStyle   = CHALK_COLORS.blue;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - Math.PI/6), y2 - size * Math.sin(angle - Math.PI/6));
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI/6), y2 - size * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ── Separator ──────────────────────────────────────────── */
  _drawSeparator() {
    const ctx = this.ctx;
    const s   = this._scale();
    ctx.save();
    ctx.strokeStyle = 'rgba(240,236,224,0.18)';
    ctx.lineWidth   = 1 * s;
    ctx.setLineDash([7 * s, 9 * s]);
    ctx.beginPath();
    ctx.moveTo(this.cx * s, this.cy * s);
    ctx.lineTo((this.cx + this.maxW) * s, this.cy * s);
    ctx.stroke();
    ctx.restore();
  }

  /* ── Canvas / Resize ────────────────────────────────────── */
  _resize() {
    const canvas = this.canvas;
    const wrap   = this.scrollWrap || canvas.parentElement;
    const rect   = wrap.getBoundingClientRect();
    const dpr    = window.devicePixelRatio || 1;
    const w      = rect.width;
    // Minimum height = visible wrap height
    const visH   = Math.max(400, rect.height);

    canvas.width        = Math.floor(w * dpr);
    canvas.height       = Math.floor(visH * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = visH + 'px';
  }

  _scale() {
    const dpr = window.devicePixelRatio || 1;
    return (this.canvas.width / dpr) / this.VW;
  }

  _clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /* ── Text Utilities ─────────────────────────────────────── */
  _measureText(text, size, bold) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT_CHALK}`;
    const w  = ctx.measureText(text).width / this._scale();
    ctx.restore();
    return w;
  }

  _wrapText(text, size, maxW) {
    const ctx    = this.ctx;
    const s      = this._scale();
    ctx.save();
    ctx.font     = `${size}px ${FONT_CHALK}`;
    const words  = text.split(' ');
    const lines  = [];
    let line     = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width / s > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    ctx.restore();
    return lines.length ? lines : [''];
  }

  /* ── Cross-browser Canvas Save ──────────────────────────── */
  saveAsImage() {
    const canvas = this.canvas;
    if (canvas.toBlob) {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `slatmind-lesson-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } else {
      // Fallback for Safari
      const a   = document.createElement('a');
      a.href     = canvas.toDataURL('image/png');
      a.download = `slatmind-lesson-${Date.now()}.png`;
      a.click();
    }
  }

  /* ── Async Helpers ──────────────────────────────────────── */
  _delay(ms) {
    if (ms <= 0) return Promise.resolve();
    return new Promise(resolve => {
      const start = performance.now();
      const tick  = () => {
        if (this._abort) { resolve(); return; }
        if (performance.now() - start >= ms) { resolve(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async _waitUnpaused() {
    while (this._paused && !this._abort) {
      await this._delay(80);
    }
  }
}

window.Whiteboard = Whiteboard;
