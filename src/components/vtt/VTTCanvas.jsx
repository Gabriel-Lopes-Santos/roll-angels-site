import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * VTTCanvas — HTML5 Canvas com grid, tokens arrastáveis, zoom/pan, HP bars.
 *
 * Props:
 *  - gridWidth, gridHeight (int)
 *  - tokens (array de objetos vtt_token)
 *  - isDM (bool)
 *  - canMoveToken (fn: token => bool)
 *  - onTokenDrop (fn: tokenId, gridX, gridY)
 *  - onTokenSelect (fn: token | null)
 *  - selectedTokenId (string | null)
 *  - hoveredCell ({ x, y } | null) — set externally if needed
 */
const CELL_SIZE = 48; // px por célula no zoom 1x
const GRID_COLOR = 'rgba(255,255,255,0.06)';
const GRID_AXIS_COLOR = 'rgba(255,255,255,0.12)';
const HOVER_COLOR = 'rgba(139, 92, 246, 0.12)';
const SELECT_COLOR = 'rgba(139, 92, 246, 0.25)';
const MOVE_RANGE_COLOR = 'rgba(52, 211, 153, 0.08)';

const TOKEN_BORDER_SELECTED = '#a78bfa';
const HP_BAR_HEIGHT = 5;
const HP_BAR_GAP = 3;

export default function VTTCanvas({
  gridWidth = 30,
  gridHeight = 30,
  tokens = [],
  isDM = false,
  canMoveToken = () => true,
  onTokenDrop,
  onTokenSelect,
  selectedTokenId,
  mode = 'exploration',
  currentTurnTokenId = null,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  // Camera state
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(null); // { tokenId, offsetX, offsetY, startGridX, startGridY }
  const [panning, setPanning] = useState(null);    // { startX, startY, camStartX, camStartY }
  const [hoverCell, setHoverCell] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Avatar image cache
  const imgCache = useRef({});

  const cellPx = CELL_SIZE * camera.zoom;

  // Load avatar images
  useEffect(() => {
    tokens.forEach(t => {
      if (t.avatar_url && !imgCache.current[t.avatar_url]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = t.avatar_url;
        img.onload = () => {
          imgCache.current[t.avatar_url] = img;
          // Trigger re-draw
          drawCanvas();
        };
        imgCache.current[t.avatar_url] = null; // placeholder while loading
      }
    });
  }, [tokens]);

  // Screen → grid coords
  const screenToGrid = useCallback((sx, sy) => {
    const gx = Math.floor((sx - camera.x) / cellPx);
    const gy = Math.floor((sy - camera.y) / cellPx);
    return { gx, gy };
  }, [camera, cellPx]);

  // Grid → screen coords (top-left corner of cell)
  const gridToScreen = useCallback((gx, gy) => {
    return {
      sx: gx * cellPx + camera.x,
      sy: gy * cellPx + camera.y,
    };
  }, [camera, cellPx]);

  // Find token at grid position
  const tokenAtGrid = useCallback((gx, gy) => {
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = tokens[i];
      if (gx >= t.grid_x && gx < t.grid_x + t.size && gy >= t.grid_y && gy < t.grid_y + t.size) {
        return t;
      }
    }
    return null;
  }, [tokens]);

  // ─── Draw ───
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0e0e12';
    ctx.fillRect(0, 0, w, h);

    // Grid bounds on screen
    const gridStartX = camera.x;
    const gridStartY = camera.y;
    const gridEndX = camera.x + gridWidth * cellPx;
    const gridEndY = camera.y + gridHeight * cellPx;

    // Grid background
    ctx.fillStyle = '#0c0c0f';
    ctx.fillRect(
      Math.max(0, gridStartX), Math.max(0, gridStartY),
      Math.min(w, gridEndX) - Math.max(0, gridStartX),
      Math.min(h, gridEndY) - Math.max(0, gridStartY),
    );

    // Grid lines
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= gridWidth; x++) {
      const sx = gridStartX + x * cellPx;
      if (sx >= 0 && sx <= w) {
        ctx.moveTo(Math.round(sx) + 0.5, Math.max(0, gridStartY));
        ctx.lineTo(Math.round(sx) + 0.5, Math.min(h, gridEndY));
      }
    }
    for (let y = 0; y <= gridHeight; y++) {
      const sy = gridStartY + y * cellPx;
      if (sy >= 0 && sy <= h) {
        ctx.moveTo(Math.max(0, gridStartX), Math.round(sy) + 0.5);
        ctx.lineTo(Math.min(w, gridEndX), Math.round(sy) + 0.5);
      }
    }
    ctx.stroke();

    // Axis lines (thicker)
    ctx.strokeStyle = GRID_AXIS_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Column labels every 5
    for (let x = 0; x <= gridWidth; x += 5) {
      const sx = gridStartX + x * cellPx;
      if (sx >= 0 && sx <= w) {
        ctx.moveTo(Math.round(sx) + 0.5, Math.max(0, gridStartY));
        ctx.lineTo(Math.round(sx) + 0.5, Math.min(h, gridEndY));
      }
    }
    for (let y = 0; y <= gridHeight; y += 5) {
      const sy = gridStartY + y * cellPx;
      if (sy >= 0 && sy <= h) {
        ctx.moveTo(Math.max(0, gridStartX), Math.round(sy) + 0.5);
        ctx.lineTo(Math.min(w, gridEndX), Math.round(sy) + 0.5);
      }
    }
    ctx.stroke();

    // Hover cell highlight
    if (hoverCell && hoverCell.gx >= 0 && hoverCell.gx < gridWidth && hoverCell.gy >= 0 && hoverCell.gy < gridHeight) {
      const { sx, sy } = gridToScreen(hoverCell.gx, hoverCell.gy);
      ctx.fillStyle = HOVER_COLOR;
      ctx.fillRect(sx, sy, cellPx, cellPx);
    }

    // Selected token highlight
    if (selectedTokenId) {
      const selTok = tokens.find(t => t.id === selectedTokenId);
      if (selTok) {
        const { sx, sy } = gridToScreen(selTok.grid_x, selTok.grid_y);
        const s = selTok.size * cellPx;
        ctx.fillStyle = SELECT_COLOR;
        ctx.fillRect(sx, sy, s, s);
        ctx.strokeStyle = TOKEN_BORDER_SELECTED;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, s - 2, s - 2);
      }
    }

    // Draw tokens
    tokens.forEach(t => {
      if (!t.visible && !isDM) return;

      const { sx, sy } = gridToScreen(t.grid_x, t.grid_y);
      const size = t.size * cellPx;
      const padding = Math.max(3, cellPx * 0.08);
      const tokenDiam = size - padding * 2;
      const cx = sx + size / 2;
      const cy = sy + size / 2;
      const radius = tokenDiam / 2;

      // Hidden token overlay for DM
      if (!t.visible && isDM) {
        ctx.globalAlpha = 0.4;
      }

      // Token circle background
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = t.color || '#ef4444';
      ctx.fill();

      // Avatar image
      const img = t.avatar_url ? imgCache.current[t.avatar_url] : null;
      if (img) {
        ctx.clip();
        ctx.drawImage(img, cx - radius, cy - radius, tokenDiam, tokenDiam);
        ctx.restore();
      } else {
        ctx.restore();
        // Fallback: first letter
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `${Math.max(12, radius * 0.8)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((t.label || '?')[0].toUpperCase(), cx, cy + 1);
      }

      // Token border
      const isCurrentTurn = currentTurnTokenId === t.id;
      const isSelected = selectedTokenId === t.id;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.lineWidth = isCurrentTurn ? 3 : isSelected ? 2.5 : 1.5;
      ctx.strokeStyle = isCurrentTurn ? '#fbbf24' : isSelected ? TOKEN_BORDER_SELECTED : 'rgba(255,255,255,0.2)';
      ctx.stroke();

      // Current turn glow
      if (isCurrentTurn) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.stroke();
      }

      // HP Bar — show for player tokens always, for monsters only if isDM
      const showHP = t.hp_max && t.hp_current !== null && t.hp_current !== undefined;
      const isMonster = !!t.monster_id;
      const shouldShowHP = showHP && (!isMonster || isDM);

      if (shouldShowHP) {
        const barW = tokenDiam * 0.8;
        const barX = cx - barW / 2;
        const barY = cy + radius + HP_BAR_GAP;
        const hpRatio = Math.max(0, Math.min(1, t.hp_current / t.hp_max));

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.roundRect(barX - 1, barY - 1, barW + 2, HP_BAR_HEIGHT + 2, 3);
        ctx.fill();

        // HP bar
        const hpColor = hpRatio > 0.5 ? '#34d399' : hpRatio > 0.25 ? '#fbbf24' : '#ef4444';
        ctx.fillStyle = hpColor;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * hpRatio, HP_BAR_HEIGHT, 2);
        ctx.fill();

        // HP text
        if (cellPx >= 36) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = `${Math.max(8, cellPx * 0.16)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`${t.hp_current}/${t.hp_max}`, cx, barY + HP_BAR_HEIGHT + 2);
        }
      }

      // Label below token
      if (cellPx >= 30) {
        const labelY = shouldShowHP ? cy + radius + HP_BAR_GAP + HP_BAR_HEIGHT + (cellPx >= 36 ? 14 : 4) : cy + radius + 6;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `${Math.max(9, cellPx * 0.18)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const maxW = size + cellPx * 0.5;
        ctx.fillText(t.label, cx, labelY, maxW);
      }

      ctx.globalAlpha = 1;
    });

    // Dragging token ghost
    if (dragging) {
      const dt = tokens.find(t => t.id === dragging.tokenId);
      if (dt) {
        const { gx, gy } = screenToGrid(mousePos.x, mousePos.y);
        const clampedX = Math.max(0, Math.min(gridWidth - dt.size, gx));
        const clampedY = Math.max(0, Math.min(gridHeight - dt.size, gy));
        const { sx, sy } = gridToScreen(clampedX, clampedY);
        const size = dt.size * cellPx;

        ctx.globalAlpha = 0.4;
        ctx.fillStyle = dt.color || '#8b5cf6';
        ctx.fillRect(sx, sy, size, size);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(sx, sy, size, size);
        ctx.setLineDash([]);
      }
    }
  }, [camera, cellPx, gridWidth, gridHeight, tokens, hoverCell, selectedTokenId, isDM, dragging, mousePos, currentTurnTokenId, gridToScreen, screenToGrid]);

  // ─── Resize ───
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      drawCanvas();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  // ─── Redraw on state change ───
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ─── Center camera initially ───
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const totalW = gridWidth * CELL_SIZE;
    const totalH = gridHeight * CELL_SIZE;
    setCamera({
      x: (wrap.clientWidth - totalW) / 2,
      y: (wrap.clientHeight - totalH) / 2,
      zoom: 1,
    });
  }, [gridWidth, gridHeight]);

  // ─── Mouse Handlers ───
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Middle click → pan
    if (e.button === 1) {
      e.preventDefault();
      setPanning({ startX: e.clientX, startY: e.clientY, camStartX: camera.x, camStartY: camera.y });
      return;
    }

    // Left click
    if (e.button === 0) {
      const { gx, gy } = screenToGrid(mx, my);
      const token = tokenAtGrid(gx, gy);

      if (token && canMoveToken(token)) {
        // Start drag
        setDragging({ tokenId: token.id, startGridX: token.grid_x, startGridY: token.grid_y });
        onTokenSelect?.(token);
        return;
      }

      onTokenSelect?.(token || null);
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: mx, y: my });

    if (panning) {
      const dx = e.clientX - panning.startX;
      const dy = e.clientY - panning.startY;
      setCamera(prev => ({ ...prev, x: panning.camStartX + dx, y: panning.camStartY + dy }));
      return;
    }

    const { gx, gy } = screenToGrid(mx, my);
    if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
      setHoverCell({ gx, gy });
    } else {
      setHoverCell(null);
    }
  };

  const handleMouseUp = (e) => {
    if (panning) {
      setPanning(null);
      return;
    }

    if (dragging) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { gx, gy } = screenToGrid(mx, my);
      const dt = tokens.find(t => t.id === dragging.tokenId);
      if (dt) {
        const clampedX = Math.max(0, Math.min(gridWidth - dt.size, gx));
        const clampedY = Math.max(0, Math.min(gridHeight - dt.size, gy));
        if (clampedX !== dragging.startGridX || clampedY !== dragging.startGridY) {
          onTokenDrop?.(dragging.tokenId, clampedX, clampedY);
        }
      }
      setDragging(null);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.3, Math.min(3, camera.zoom * zoomFactor));
    const scale = newZoom / camera.zoom;

    setCamera(prev => ({
      zoom: newZoom,
      x: mx - (mx - prev.x) * scale,
      y: my - (my - prev.y) * scale,
    }));
  };

  const handleContextMenu = (e) => e.preventDefault();

  return (
    <div className="vtt-canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setHoverCell(null); if (panning) setPanning(null); }}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
      {hoverCell && (
        <div className="vtt-coords">
          {hoverCell.gx + 1}, {hoverCell.gy + 1}
        </div>
      )}
    </div>
  );
}
