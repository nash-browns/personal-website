// Photo essays share max-w-7xl (1280px), px-4 (32px), and sm:px-10 (80px).
// Fractions follow the grid tracks; insets include nested padding and gaps
// before dividing that available space among the tracks.
export function photoEssaySizes({ desktop = 1, mobile = 1, desktopInset = 0, mobileInset = 0 } = {}) {
    const round = value => Number(value.toFixed(3));
    return `(min-width: 1280px) ${round((1200 - desktopInset) * desktop)}px, (min-width: 640px) calc(${round(100 * desktop)}vw - ${round((80 + desktopInset) * desktop)}px), calc(${round(100 * mobile)}vw - ${round((32 + mobileInset) * mobile)}px)`;
}
