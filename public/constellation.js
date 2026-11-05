/* ═══════════════════════════════════════════════════════════════
   SlateMind — constellation.js
   Interactive Knowledge Constellation map of explored concepts
   ═══════════════════════════════════════════════════════════════ */
'use strict';

let _constellationNodes = [];
let _constellationHover = null;
let _constellationWired = false;

function renderConstellation() {
  const canvas = el('constellationCanvas');
  const empty = el('constellationEmpty');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const history = STATE.lessonHistory || [];
  if (!history.length) {
    if (empty) empty.style.display = 'block';
    const sC = el('constellationStarCount'), lC = el('constellationLinkCount');
    if (sC) sC.textContent = '0';
    if (lC) lC.textContent = '0';
    return;
  }
  if (empty) empty.style.display = 'none';

  // Extract unique topics
  const seen = new Set();
  const nodes = [];
  history.forEach((h, idx) => {
    const key = (h.topic || '').trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      nodes.push({
        topic: h.topic,
        diff: h.diff || 'Intermediate',
        xp: h.xp || 80,
        origIdx: idx
      });
    }
  });

  const cx = W / 2, cy = H / 2;
  nodes.forEach((node, i) => {
    if (i === 0) {
      node.x = cx;
      node.y = cy;
    } else {
      const angle = i * 2.39996;
      const r = Math.min(cx - 90, Math.min(cy - 60, 48 * Math.sqrt(i) + 45));
      node.x = cx + Math.cos(angle) * r;
      node.y = cy + Math.sin(angle) * (r * 0.78);
    }
    node.radius = 10 + Math.min(6, (node.xp || 80) / 25);
  });

  _constellationNodes = nodes;

  // Draw connections between sequential nodes
  ctx.save();
  let linkCount = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(88, 214, 141, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    linkCount++;
  }
  ctx.restore();

  const starCountEl = el('constellationStarCount');
  const linkCountEl = el('constellationLinkCount');
  if (starCountEl) starCountEl.textContent = nodes.length;
  if (linkCountEl) linkCountEl.textContent = linkCount;

  // Draw nodes
  nodes.forEach(node => {
    const isHover = _constellationHover === node;
    const colorMap = { Beginner: '#58d68d', Intermediate: '#f4c542', Advanced: '#ef4444' };
    const starColor = colorMap[node.diff] || '#58d68d';

    // Outer glow
    ctx.save();
    const g = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, node.radius * (isHover ? 2.5 : 1.8));
    g.addColorStop(0, starColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius * (isHover ? 2.5 : 1.8), 0, Math.PI * 2);
    ctx.fill();

    // Star core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(node.x, node.y, isHover ? node.radius * 0.65 : node.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.font = `600 ${isHover ? 13 : 11}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = isHover ? '#ffffff' : '#e0d7cd';
    ctx.textAlign = 'center';
    ctx.fillText(node.topic, node.x, node.y + node.radius + 14);

    if (isHover) {
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = starColor;
      ctx.fillText(`${node.diff} • +${node.xp} XP (Click to open)`, node.x, node.y + node.radius + 28);
    }
    ctx.restore();
  });

  // Wire mouse interaction once
  if (!_constellationWired) {
    _constellationWired = true;
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      let found = null;
      for (const node of _constellationNodes) {
        if (Math.hypot(mx - node.x, my - node.y) <= node.radius + 14) {
          found = node;
          break;
        }
      }
      if (found !== _constellationHover) {
        _constellationHover = found;
        canvas.style.cursor = found ? 'pointer' : 'crosshair';
        renderConstellation();
      }
    });

    canvas.addEventListener('click', () => {
      if (_constellationHover) {
        const histItem = STATE.lessonHistory[_constellationHover.origIdx];
        if (window.sound) sound('click');
        closeModal('constellationOverlay');
        if (window.loadHistoryLesson) window.loadHistoryLesson(histItem);
      }
    });
  }
}

window.renderConstellation = renderConstellation;
