/** WCAG relative luminance for opaque six-digit sRGB palette tokens. */
export function paletteContrast(foreground: string, background: string): number {
  if (![foreground, background].every(color => /^#[a-fA-F0-9]{6}$/.test(color))) return 0;
  const luminance = (value: string) => [1, 3, 5].map(offset => parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const first = luminance(foreground), second = luminance(background);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
