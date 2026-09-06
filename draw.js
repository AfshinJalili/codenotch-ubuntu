import {remainingPercent} from './model.js';
import {LAYOUT, PALETTE, PROVIDER_COLORS, hexToRgb} from './design.js';
import {GLYPH_OUTLINES, GLYPH_SCALE, GLYPHS} from './glyphs.js';

export function traceNotchPath(cr, w, h, edge, expanded) {
    if (!expanded) {
        const pillW = edge === 'left' || edge === 'right' ? LAYOUT.pillWidth : LAYOUT.pillHeight;
        const pillH = edge === 'left' || edge === 'right' ? LAYOUT.pillHeight : LAYOUT.pillWidth;
        const r = Math.min(8, pillW / 2, pillH / 2);
        cr.newSubPath();
        cr.arc(r, r, r, Math.PI, Math.PI * 1.5);
        cr.arc(pillW - r, r, r, Math.PI * 1.5, 0);
        cr.arc(pillW - r, pillH - r, r, 0, Math.PI * 0.5);
        cr.arc(r, pillH - r, r, Math.PI * 0.5, Math.PI);
        cr.closePath();
        return;
    }
    const depth = edge === 'left' || edge === 'right' ? w : h;
    const length = edge === 'left' || edge === 'right' ? h : w;
    const flare = LAYOUT.curlRadius;
    const wanted = Math.max(0, Math.min(LAYOUT.cornerRadius, depth / 2));
    const curl = Math.max(0, Math.min(flare, length / 2, depth - wanted));
    const corner = Math.max(0, Math.min(wanted, (length - 2 * curl) / 2));
    const bodyTop = curl;
    const bodyBottom = length - curl;
    const bezel = depth;

    cr.newSubPath();
    cr.moveTo(bezel, 0);
    if (curl > 0)
        cr.arc(bezel - curl, 0, curl, 0, Math.PI / 2);
    cr.lineTo(corner, bodyTop);
    cr.arcNegative(corner, bodyTop + corner, corner, -Math.PI / 2, -Math.PI);
    cr.lineTo(0, bodyBottom - corner);
    cr.arcNegative(corner, bodyBottom - corner, corner, Math.PI, Math.PI / 2);
    cr.lineTo(bezel - curl, bodyBottom);
    if (curl > 0)
        cr.arc(bezel - curl, bodyBottom + curl, curl, -Math.PI / 2, 0);
    cr.lineTo(bezel, length);
    cr.closePath();
}

export function drawFilledPath(cr, pathFn, w, h, edge, expanded, fill = PALETTE.notch) {
    cr.save();
    if (edge === 'left') {
        cr.translate(w, 0);
        cr.scale(-1, 1);
        pathFn(cr, w, h, 'right', expanded);
    } else if (edge === 'top') {
        cr.translate(0, h);
        cr.rotate(-Math.PI / 2);
        pathFn(cr, h, w, 'right', expanded);
    } else if (edge === 'bottom') {
        cr.translate(w, 0);
        cr.rotate(Math.PI / 2);
        pathFn(cr, h, w, 'right', expanded);
    } else {
        pathFn(cr, w, h, 'right', expanded);
    }
    const rgb = hexToRgb(fill);
    cr.setSourceRGBA(...rgb, 1);
    cr.fill();
    cr.restore();
}

export function drawGlyph(cr, providerId, cx, cy, size) {
    const key = GLYPHS[providerId];
    const loops = GLYPH_OUTLINES[key];
    if (!loops?.length) return;
    const scale = (GLYPH_SCALE[key] ?? 1) * size;
    const ox = cx - scale / 2;
    const oy = cy - scale / 2;
    cr.save();
    cr.translate(ox, oy);
    cr.scale(scale, scale);
    cr.setSourceRGBA(1, 1, 1, 1);
    for (const loop of loops) {
        if (!loop.length) continue;
        cr.newSubPath();
        cr.moveTo(loop[0][0], loop[0][1]);
        for (let i = 1; i < loop.length; i++)
            cr.lineTo(loop[i][0], loop[i][1]);
        cr.closePath();
    }
    cr.fill();
    cr.restore();
}

export function drawRing(cr, w, h, usedPercent, stale, phase, sessions, providerId) {
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - LAYOUT.trackStroke / 2;
    const track = hexToRgb(PALETTE.ringTrack);
    cr.setLineWidth(LAYOUT.trackStroke);
    cr.setLineCap(1); // round
    cr.setSourceRGBA(...track, 1);
    cr.arc(cx, cy, radius, 0, Math.PI * 2);
    cr.stroke();

    if (typeof usedPercent === 'number' && Number.isFinite(usedPercent)) {
        const fraction = remainingPercent(usedPercent) / 100;
        const color = hexToRgb(PROVIDER_COLORS[providerId] ?? PALETTE.textPrimary);
        cr.setLineWidth(LAYOUT.progressStroke);
        cr.setSourceRGBA(...color, stale ? 0.45 : 1);
        if (fraction > 0) {
            cr.arc(cx, cy, radius - (LAYOUT.trackStroke - LAYOUT.progressStroke) / 2,
                -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
            cr.stroke();
        }
    }

    const waiting = sessions?.some(s => s.state === 'waiting');
    const busy = sessions?.some(s => s.state === 'busy');
    if (waiting || busy) {
        const inset = (LAYOUT.ringDiameter - LAYOUT.activityDiameter) / 2;
        const ir = radius - inset;
        cr.setLineWidth(LAYOUT.activityStroke);
        if (waiting) {
            const pulse = 0.55 + Math.sin(phase * 2) * 0.35;
            cr.setSourceRGBA(...hexToRgb(PALETTE.watch), pulse);
            cr.arc(cx, cy, ir, 0, Math.PI * 2);
            cr.stroke();
        } else {
            const start = phase % (Math.PI * 2);
            cr.setSourceRGBA(...hexToRgb(PALETTE.ample), 0.95);
            cr.arc(cx, cy, ir, start, start + Math.PI * 0.5);
            cr.stroke();
        }
    }

    drawGlyph(cr, providerId, cx, cy, LAYOUT.glyphSize);
}

export function drawProgressBar(cr, x, y, width, fraction, stale, providerId) {
    const h = LAYOUT.barHeight;
    const track = hexToRgb(PALETTE.barTrack);
    cr.setSourceRGBA(...track, 1);
    cr.newSubPath();
    cr.arc(x + h / 2, y + h / 2, h / 2, Math.PI / 2, Math.PI * 1.5);
    cr.arc(x + width - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
    cr.closePath();
    cr.fill();
    if (typeof fraction === 'number' && fraction > 0) {
        const fillW = Math.max(h, width * Math.min(fraction, 1));
        const color = hexToRgb(PROVIDER_COLORS[providerId] ?? PALETTE.textPrimary);
        cr.setSourceRGBA(...color, stale ? 0.45 : 1);
        cr.newSubPath();
        cr.arc(x + h / 2, y + h / 2, h / 2, Math.PI / 2, Math.PI * 1.5);
        cr.arc(x + fillW - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
        cr.closePath();
        cr.fill();
    }
}

export function drawTooltipTail(cr, w, h, direction) {
    const rgb = hexToRgb(PALETTE.card);
    cr.setSourceRGBA(...rgb, 1);
    cr.newSubPath();
    if (direction === 'leading') {
        cr.moveTo(0, 0);
        cr.lineTo(w, h / 2);
        cr.lineTo(0, h);
    } else if (direction === 'trailing') {
        cr.moveTo(w, 0);
        cr.lineTo(0, h / 2);
        cr.lineTo(w, h);
    } else if (direction === 'down') {
        cr.moveTo(0, 0);
        cr.lineTo(w / 2, h);
        cr.lineTo(w, 0);
    } else {
        cr.moveTo(0, h);
        cr.lineTo(w / 2, 0);
        cr.lineTo(w, h);
    }
    cr.closePath();
    cr.fill();
}

