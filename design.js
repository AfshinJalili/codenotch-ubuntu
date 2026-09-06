// Design tokens from vinzdg/codenotch (Palette.swift, Design.swift, NotchLayout.swift).

export const SCALE = 44 / 117;
export const px = pixels => pixels * SCALE;
const capRatio = 0.714;
export const fontSize = capPixels => px(capPixels) / capRatio;

export const PALETTE = {
    notch: '#000000',
    card: '#000000',
    ringTrack: '#303030',
    barTrack: '#2D2D2D',
    ample: '#00FF88',
    watch: '#F2FF00',
    critical: '#FF3F00',
    textPrimary: '#ffffff',
    textSecondary: '#808080',
};

export const PROVIDER_COLORS = {claude: '#E9956C', cursor: '#B59AFF', codex: '#63D9AE'};

export const LAYOUT = {
    sideBodyDepth: px(186),
    curlRadius: px(103),
    cornerRadius: px(78.8),
    bezelFillet: px(28),
    padTop: px(69.5),
    padBottom: px(50.1),
    cellSpacing: px(83.5),
    pillWidth: 6,
    pillHeight: 56,
    pillHotZone: px(90),
    ringDiameter: px(117),
    trackStroke: px(15.5),
    progressStroke: px(8),
    glyphSize: px(46),
    ringLabelGap: px(26.9),
    activityDiameter: px(72),
    activityStroke: px(5.5),
    settingsSize: 32,
    settingsGap: 6,
    cardWidth: 300,
    cardCorner: px(49.5),
    cardPadding: 16,
    tailLength: 16,
    tailHeight: 24,
    tailGap: px(28),
    barHeight: px(10.5),
    headerGap: px(17),
    headerToBlock: px(21),
    labelToBar: px(16.8),
    barToUsed: px(17.8),
    blockSpacing: 12,
    sessionRowGap: px(10),
    hairline: px(2.5),
    statusDot: px(17),
    statusDotStroke: px(3.4),
    statusDotGap: px(11),
};

export function percentLineHeight() {
    return Math.ceil(fontSize(27) * 1.15);
}

export function cellExtent(vertical = true) {
    return vertical
        ? LAYOUT.ringDiameter + LAYOUT.ringLabelGap + percentLineHeight()
        : LAYOUT.ringDiameter + LAYOUT.ringLabelGap + 36;
}

export function bodyLength(cellCount, vertical = true) {
    const start = LAYOUT.padTop;
    const end = LAYOUT.padBottom;
    const along = cellExtent(vertical);
    if (cellCount <= 0) return start + end;
    return start + cellCount * along + (cellCount - 1) * LAYOUT.cellSpacing + end;
}

export function shapeLength(cellCount, vertical = true) {
    return bodyLength(cellCount, vertical) + 2 * LAYOUT.curlRadius;
}

export function usageBand(fraction) {
    if (fraction < 0.5) return 'ample';
    if (fraction < 0.7) return 'watch';
    if (fraction < 1.0) return 'critical';
    return 'exhausted';
}

export function bandColor(band) {
    return band === 'ample' ? PALETTE.ample : band === 'watch' ? PALETTE.watch : PALETTE.critical;
}

export function activityColor(state) {
    if (state === 'busy') return PALETTE.ample;
    if (state === 'waiting') return PALETTE.watch;
    return PALETTE.textSecondary;
}

export function hexToRgb(hex) {
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
}

export function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export function easeIn(t) {
    return t * t;
}
