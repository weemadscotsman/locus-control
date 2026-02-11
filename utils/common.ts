
/**
 * Converts HSL color values to RGB array [r, g, b]
 * @param h Hue (0-360)
 * @param s Saturation (0-1)
 * @param l Lightness (0-1)
 * @returns [r, g, b] (0-255)
 */
export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; 
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, (h/360) + 1/3);
        g = hue2rgb(p, q, (h/360));
        b = hue2rgb(p, q, (h/360) - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

/**
 * Generates a random IP address for simulation
 */
export const generateRandomIP = () => `192.168.1.${Math.floor(Math.random() * 255)}`;

/**
 * Linear interpolation
 */
export const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
