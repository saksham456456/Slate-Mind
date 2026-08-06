/* ═══════════════════════════════════════════════════════════════
   whiteboard.js  — Canvas handwriting + drawing engine
   Professor Byte Gamified AI Teacher
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── Constants ─────────────────────────────────────────────── */
const CHALK_COLORS = {
  white:  '#f0ece0',
  yellow: '#f4d03f',
  green:  '#58d68d',
  pink:   '#f1948a',
  blue:   '#85c1e9',
  orange: '#f0a500',
};

const BLOCK_COLORS = {
  heading:   CHALK_COLORS.yellow,
  text:      CHALK_COLORS.white,
  bullet:    CHALK_COLORS.white,
  equation:  CHALK_COLORS.green,
  diagram:   CHALK_COLORS.blue,
  emphasize: CHALK_COLORS.pink,
  checkpoint:CHALK_COLORS.orange,
};

const SPEED_MAP = {
  slow:    { char: 38, line: 22 },
  normal:  { char: 18, line: 12 },
  fast:    { char: 6,  line: 4  },
  instant: { char: 0,  line: 0  },
};

const FONT_CHALK = '"Caveat", cursive';
const FONT_MONO  = '"Share Tech Mono", monospace';

/* ── Whiteboard Class ───────────────────────────────────────── */
class Whiteboard {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');

    this._speed    = 'normal';
    this._paused   = false;
    this._writing  = false;
    this._queue    = [];
    this._abort    = false;
    this._penColor = CHALK_COLORS.white;

    // Virtual canvas coordinates (for layout)
    this.VW = 900;
    this.VH = 560;

    // Current drawing cursor
    this.cx = 40;
    this.cy = 50;
    this.lineH = 34;
    this.margin = 40;
    this.maxW   = this.VW - this.margin * 2;

    // Pen tip particle
    this._penX = 0;
    this._penY = 0;
    this._penVisible = false;

    this._onBlockDone = null; // callback per block
    this._onAllDone   = null; // callback when all blocks finish

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._startRenderLoop();
  }

  /* ── Public API ──────────────────────────────────────────── */

  setSpeed(s)   { this._speed = SPEED_MAP[s] ? s : 'normal'; }
  setPaused(v)  { this._paused = v; }
  isWriting()   { return this._writing; }

  clear() {
    this._abort = true;
    this._queue = [];
    this._writing = false;
    this._penVisible = false;
    this.cx = this.margin;
    this.cy = 50;
    this._clearCanvas();
  }

  /** Render a full lesson (array of blocks) */
  async renderLesson(blocks, opts = {}) {
    this._abort = false;
    this._writing = true;
    this._onBlockDone = opts.onBlockDone || null;
    this._onAllDone   = opts.onAllDone   || null;

    // Reset cursor
    this.cx = this.margin;
    this.cy = 50;

    for (let i = 0; i < blocks.length; i++) {
      if (this._abort) break;
      const block = blocks[i];
      await this._waitUnpaused();
      await this._renderBlock(block, i);
      if (this._onBlockDone) this._onBlockDone(i, block);
      if (this._abort) break;
    }

    this._writing = false;
    this._penVisible = false;
    if (!this._abort && this._onAllDone) this._onAllDone();
  }

  /** Append more blocks below existing content */
  async appendBlocks(blocks, opts = {}) {
    this._abort = false;
    this._writing = true;
    this._onBlockDone = opts.onBlockDone || null;
    this._onAllDone   = opts.onAllDone   || null;

    // Add a small separator line
    this.cy += 20;
    this._drawSeparator();
    this.cy += 26;

    for (let i = 0; i < blocks.length; i++) {
      if (this._abort) break;
      await this._waitUnpaused();
      await this._renderBlock(blocks[i], i);
      if (this._onBlockDone) this._onBlockDone(i, blocks[i]);
    }

    this._writing = false;
    this._penVisible = false;
    if (!this._abort && this._onAllDone) this._onAllDone();
  }

  /* ── Block Dispatcher ──────────────────────────────────────── */

  async _renderBlock(block, idx) {
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
    this.cy += 8;
    const ctx = this.ctx;
    const s   = this._scale();
    const x   = this.cx * s;
    const y   = this.cy * s;

    // Underline drawn first (backwards, like chalking)
    const textW = this._measureText(block.text, 32, true) * s;
    ctx.save();
    ctx.strokeStyle = CHALK_COLORS.yellow;
    ctx.lineWidth   = 2.5 * s;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y + 38 * s);
    ctx.lineTo(x + textW, y + 38 * s);
    ctx.stroke();
    ctx.restore();

    await this._drawChalkText(block.text, this.cx, this.cy, {
      font: `bold 32px ${FONT_CHALK}`,
      color: CHALK_COLORS.yellow,
      shadow: true,
    });
    this.cy += 44;
  }

  /* ── Text ─────────────────────────────────────────────────── */

  async _renderText(block) {
    this.cy += 4;
    const lines = this._wrapText(block.text, 18, this.maxW);
    for (const line of lines) {
      if (this._abort) return;
      await this._waitUnpaused();
      await this._drawChalkText(line, this.cx, this.cy, {
        font: `18px ${FONT_CHALK}`,
        color: CHALK_COLORS.white,
      });
      this.cy += this.lineH - 4;
    }
    this.cy += 6;
  }

  /* ── Bullet ─────────────────────────────────────────────────── */

  async _renderBullet(block) {
    this.cy += 4;
    for (const item of (block.items || [])) {
      if (this._abort) return;
      await this._waitUnpaused();

      // Draw bullet dot
      const s   = this._scale();
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = CHALK_COLORS.green;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc((this.cx + 4) * s, (this.cy + 6) * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const lines = this._wrapText(item, 17, this.maxW - 22);
      for (let li = 0; li < lines.length; li++) {
        const indentX = li === 0 ? this.cx + 18 : this.cx + 18;
        await this._drawChalkText(lines[li], indentX, this.cy + (li > 0 ? 2 : 0), {
          font: `17px ${FONT_CHALK}`,
          color: CHALK_COLORS.white,
          maxW:  this.maxW - 22,
        });
        if (li < lines.length - 1) this.cy += this.lineH - 6;
      }
      this.cy += this.lineH - 2;
    }
    this.cy += 4;
  }

  /* ── Equation ────────────────────────────────────────────── */

  async _renderEquation(block) {
    this.cy += 10;
    const s   = this._scale();
    const ctx = this.ctx;

    // Box border
    ctx.save();
    ctx.strokeStyle = CHALK_COLORS.green;
    ctx.lineWidth   = 1.5 * s;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([4 * s, 4 * s]);
    const bx = (this.cx - 10) * s;
    const by = (this.cy - 8) * s;
    const bw = (this.maxW + 20) * s;
    const bh = 46 * s;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6 * s);
    ctx.stroke();
    ctx.restore();

    await this._drawChalkText(block.text, this.cx + 10, this.cy + 8, {
      font: `22px ${FONT_MONO}`,
      color: CHALK_COLORS.green,
      shadow: true,
      charByChar: true,
    });
    this.cy += 50;
  }

  /* ── Emphasize ───────────────────────────────────────────── */

  async _renderEmphasize(block) {
    this.cy += 8;
    await this._drawChalkText(block.text, this.cx, this.cy, {
      font: `bold 20px ${FONT_CHALK}`,
      color: CHALK_COLORS.pink,
      shadow: true,
    });

    const s      = this._scale();
    const ctx    = this.ctx;
    const textW  = this._measureText(block.text, 20, true) * s;
    const style  = block.style || 'underline';

    await this._delay(80);

    ctx.save();
    ctx.strokeStyle = CHALK_COLORS.pink;
    ctx.lineWidth   = 2.5 * s;
    ctx.globalAlpha = 0.75;

    if (style === 'underline' || style === 'circle') {
      if (style === 'underline') {
        ctx.beginPath();
        ctx.moveTo(this.cx * s, (this.cy + 24) * s);
        await this._strokeAnimate(ctx, [
          [this.cx * s, (this.cy + 24) * s],
          [(this.cx + textW / s + 10) * s, (this.cy + 24) * s],
        ]);
      } else {
        // Ellipse around the text
        const cx2 = (this.cx + textW / s / 2) * s;
        const cy2 = (this.cy + 12) * s;
        const rx  = (textW / 2 + 14 * s);
        const ry  = 20 * s;
        await this._strokeEllipseAnimate(ctx, cx2, cy2, rx, ry);
      }
    } else if (style === 'box') {
      const bx = (this.cx - 6) * s;
      const by = (this.cy - 4) * s;
      const bw = textW + 12 * s;
      const bh = 32 * s;
      await this._strokeRectAnimate(ctx, bx, by, bw, bh);
    }

    ctx.restore();
    this.cy += 40;
  }

  /* ── Checkpoint ──────────────────────────────────────────── */

  async _renderCheckpoint(block) {
    this.cy += 10;
    const s   = this._scale();
    const ctx = this.ctx;

    // Draw a star/flag marker
    ctx.save();
    ctx.font      = `${24 * s}px serif`;
    ctx.fillStyle = CHALK_COLORS.orange;
    ctx.globalAlpha = 0.9;
    ctx.fillText('⚑', (this.cx) * s, (this.cy + 16) * s);
    ctx.restore();

    await this._drawChalkText('Checkpoint — Think about it!', this.cx + 32, this.cy, {
      font: `bold 16px ${FONT_CHALK}`,
      color: CHALK_COLORS.orange,
    });
    this.cy += 26;

    // Trigger checkpoint popup after a delay
    await this._delay(600);
    if (!this._abort && block.question) {
      window.dispatchEvent(new CustomEvent('wb:checkpoint', {
        detail: { question: block.question, hint: block.hint || '' }
      }));
    }
    this.cy += 6;
  }

  /* ── Diagram ─────────────────────────────────────────────── */

  async _renderDiagram(block) {
    if (!block.shapes || block.shapes.length === 0) return;
    this.cy += 12;

    const s   = this._scale();
    const ctx = this.ctx;
    const offsetY = this.cy;

    for (const shape of block.shapes) {
      if (this._abort) return;
      await this._waitUnpaused();
      await this._drawShape(ctx, shape, s, offsetY);
    }

    // Calculate bounding box of shapes to advance cy
    let maxY = 0;
    for (const sh of block.shapes) {
      const bottom = (sh.y || 0) + (sh.h || 60);
      if (bottom > maxY) maxY = bottom;
    }
    this.cy = offsetY + Math.min(maxY + 24, 200);
  }

  async _drawShape(ctx, sh, s, offsetY) {
    const kind  = sh.kind  || 'box';
    const x     = ((sh.x || 50));
    const y     = (offsetY + (sh.y || 20));
    const w     = sh.w || 100;
    const h     = sh.h || 50;
    const label = sh.label || '';

    ctx.save();
    ctx.strokeStyle = CHALK_COLORS.blue;
    ctx.fillStyle   = 'rgba(133,193,233,0.06)';
    ctx.lineWidth   = 2 * s;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([]);

    if (kind === 'box' || kind === 'rect') {
      await this._strokeRectAnimate(ctx, x * s, y * s, w * s, h * s, 6 * s);
      ctx.fill();
    } else if (kind === 'circle') {
      const cx2 = (x + w / 2) * s;
      const cy2 = (y + h / 2) * s;
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
                                to[0]   * s, (offsetY + to[1])   * s, 10 * s);
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
      const lx = (kind === 'arrow') ? ((sh.from?.[0] || x) + (sh.to?.[0] || x + w)) / 2 : x + w / 2;
      const ly = (kind === 'arrow') ? offsetY + ((sh.from?.[1] || y) + (sh.to?.[1] || y)) / 2 - 8 : y + h / 2;
      ctx.save();
      ctx.font      = `bold ${13 * s}px ${FONT_CHALK}`;
      ctx.fillStyle = CHALK_COLORS.white;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.92;
      ctx.fillText(label, lx * s, (ly + 5) * s);
      ctx.restore();
    }

    ctx.restore();
    await this._delay(80);
  }

  /* ── Core Text Renderer ─────────────────────────────────── */

  async _drawChalkText(text, x, y, opts = {}) {
    const ctx     = this.ctx;
    const s       = this._scale();
    const font    = opts.font  || `18px ${FONT_CHALK}`;
    const color   = opts.color || CHALK_COLORS.white;
    const doChar  = opts.charByChar !== false;
    const delay   = SPEED_MAP[this._speed].char;

    ctx.save();
    ctx.font         = font;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';

    // Draw chalk dust glow
    if (opts.shadow) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 3 * s;
    }

    let drawn = '';
    for (let i = 0; i < text.length; i++) {
      if (this._abort) break;
      await this._waitUnpaused();

      drawn += text[i];

      // Clear then redraw with jitter
      ctx.clearRect(
        (x - 2) * s,
        (y - 2) * s,
        this._measureText(text, parseInt(font), false) * s + 8 * s,
        38 * s
      );

      // Chalk texture — slight opacity jitter
      ctx.globalAlpha = 0.88 + Math.random() * 0.12;
      ctx.fillStyle   = color;

      // Tiny positional jitter for authenticity
      const jx = (Math.random() - 0.5) * 0.4;
      const jy = (Math.random() - 0.5) * 0.4;

      ctx.fillText(drawn, (x + jx) * s, (y + jy) * s);

      // Move pen tip
      this._penX      = (x + ctx.measureText(drawn).width / s) * s;
      this._penY      = y * s;
      this._penVisible = true;

      if (delay > 0) await this._delay(delay + Math.random() * 8 - 4);
    }

    // Final clean render (no jitter)
    ctx.globalAlpha = 0.9 + Math.random() * 0.1;
    ctx.clearRect((x - 2) * s, (y - 2) * s,
      (this._measureText(text, parseInt(font), false) + 8) * s, 38 * s);
    ctx.fillText(text, x * s, y * s);

    this._penVisible = false;
    ctx.restore();

    if (delay > 0) await this._delay(SPEED_MAP[this._speed].line);
  }

  /* ── Stroke Animation Helpers ───────────────────────────── */

  async _strokeAnimate(ctx, points) {
    if (points.length < 2) return;
    const speed = SPEED_MAP[this._speed];

    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const steps = speed.char === 0 ? 1 : Math.max(1, Math.floor(dist / 3));

      for (let j = 1; j <= steps; j++) {
        if (this._abort) return;
        await this._waitUnpaused();
        const t  = j / steps;
        const px = x0 + (x1 - x0) * t;
        const py = y0 + (y1 - y0) * t;
        ctx.lineTo(px, py);
        ctx.stroke();
        if (speed.char > 0) await this._delay(speed.char / 4);
      }
    }
  }

  async _strokeRectAnimate(ctx, x, y, w, h, r = 0) {
    const points = r > 0
      ? this._roundRectPoints(x, y, w, h, r)
      : [[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
    await this._strokeAnimate(ctx, points);
  }

  async _strokeEllipseAnimate(ctx, cx, cy, rx, ry) {
    const speed  = SPEED_MAP[this._speed];
    const steps  = speed.char === 0 ? 1 : 60;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      if (this._abort) return;
      await this._waitUnpaused();
      const angle = (i / steps) * Math.PI * 2;
      const px = cx + rx * Math.cos(angle);
      const py = cy + ry * Math.sin(angle);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      ctx.stroke();
      if (speed.char > 0) await this._delay(speed.char / 3);
    }
  }

  _roundRectPoints(x, y, w, h, r) {
    // Approximate rounded rect as a series of points
    const pts = [];
    const steps = 8;
    const corners = [
      [x + r,   y + r,   Math.PI,       Math.PI * 1.5],
      [x + w - r, y + r, Math.PI * 1.5, Math.PI * 2  ],
      [x + w - r, y + h - r, 0,         Math.PI * 0.5],
      [x + r,   y + h - r, Math.PI * 0.5, Math.PI    ],
    ];
    for (const [cx, cy, startA, endA] of corners) {
      for (let i = 0; i <= steps; i++) {
        const a = startA + (endA - startA) * (i / steps);
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
    }
    pts.push(pts[0]); // close
    return pts;
  }

  _drawArrowHead(ctx, x1, y1, x2, y2, size) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.fillStyle = CHALK_COLORS.blue;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6),
               y2 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6),
               y2 - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ── Separator ───────────────────────────────────────────── */

  _drawSeparator() {
    const ctx = this.ctx;
    const s   = this._scale();
    ctx.save();
    ctx.strokeStyle = 'rgba(240,236,224,0.15)';
    ctx.lineWidth   = 1 * s;
    ctx.setLineDash([6 * s, 8 * s]);
    ctx.beginPath();
    ctx.moveTo(this.cx * s, this.cy * s);
    ctx.lineTo((this.cx + this.maxW) * s, this.cy * s);
    ctx.stroke();
    ctx.restore();
  }

  /* ── Canvas & Resize ─────────────────────────────────────── */

  _resize() {
    const canvas  = this.canvas;
    const parent  = canvas.parentElement;
    const rect    = parent.getBoundingClientRect();
    const dpr     = window.devicePixelRatio || 1;
    const w       = rect.width;
    const h       = rect.height - 28; // chalk tray

    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w  + 'px';
    canvas.style.height = h + 'px';

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this._aspectW = w * dpr;
    this._aspectH = h * dpr;
  }

  _scale() {
    return this.canvas.width / this.VW;
  }

  _clearCanvas() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /* ── Text Utilities ─────────────────────────────────────── */

  _measureText(text, size, isBold) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `${isBold ? 'bold ' : ''}${size}px ${FONT_CHALK}`;
    const w = ctx.measureText(text).width / this._scale();
    ctx.restore();
    return w;
  }

  _wrapText(text, size, maxW) {
    const ctx  = this.ctx;
    const s    = this._scale();
    ctx.save();
    ctx.font = `${size}px ${FONT_CHALK}`;
    const words = text.split(' ');
    const lines = [];
    let line = '';
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

  /* ── Pen-tip render loop ─────────────────────────────────── */

  _startRenderLoop() {
    const draw = () => {
      // Pen tip is layered on top during writing
      if (this._penVisible) {
        const ctx = this.ctx;
        const s   = this._scale();
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(this._penX, this._penY + 16 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  /* ── Helpers ─────────────────────────────────────────────── */

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

/* ── Export ──────────────────────────────────────────────── */
window.Whiteboard = Whiteboard;
