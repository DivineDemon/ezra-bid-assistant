/** Lucide Atom icon paths + Ezra theme colors (dark primary). */
export const EZRA_PRIMARY = "#5E52E8";
export const EZRA_PRIMARY_BG = "#161B26";

export const ATOM_ICON_PATHS = [
  '<circle cx="12" cy="12" r="1"/>',
  '<path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/>',
  '<path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
  '<path d="M8.3 15.7c-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5 4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5Z"/>',
].join("");

export function atomIconSvg(
  options: {
    size?: number;
    stroke?: string;
    strokeWidth?: number;
    withBadge?: boolean;
    badgeFill?: string;
    badgeStroke?: string;
  } = {},
): string {
  const {
    size = 24,
    stroke = EZRA_PRIMARY,
    strokeWidth = 2.25,
    withBadge = false,
    badgeFill = "rgba(94, 82, 232, 0.15)",
    badgeStroke = "rgba(94, 82, 232, 0.25)",
  } = options;

  const icon = `<g stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round">${ATOM_ICON_PATHS.replace('<circle cx="12" cy="12" r="1"/>', `<circle cx="12" cy="12" r="1" fill="${stroke}"/>`)}</g>`;

  if (!withBadge) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="6" fill="${badgeFill}" stroke="${badgeStroke}"/><g transform="translate(12 12) scale(0.72) translate(-12 -12)">${icon}</g></svg>`;
}

export function appIconSvg(size: number): string {
  const radius = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${EZRA_PRIMARY_BG}"/>
  <g transform="translate(${size / 2} ${size / 2}) scale(${size / 48}) translate(-12 -12)" stroke="${EZRA_PRIMARY}" stroke-width="2.25" fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${ATOM_ICON_PATHS.replace('<circle cx="12" cy="12" r="1"/>', `<circle cx="12" cy="12" r="1" fill="${EZRA_PRIMARY}"/>`)}
  </g>
</svg>`;
}
