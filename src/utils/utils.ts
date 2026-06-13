// ~ FILE-PATH: src/utils/utils.ts

/**
 * Uses a 2D canvas to check if a character has any visible pixels.
 * This helps filter out blank or control characters.
 */
export const isCharacterRenderable = (
  char: string,
  ctx: CanvasRenderingContext2D | null,
): boolean => {
  if (!ctx) return true;
  ctx.clearRect(0, 0, 16, 16);
  ctx.font = '16px "Iosevka Nerd Font Propo"';
  ctx.textBaseline = "top";
  ctx.fillText(char, 0, 0);
  const imgData = ctx.getImageData(0, 0, 16, 16);
  // Check the alpha channel data
  for (let i = 3; i < imgData.data.length; i += 4) {
    if (imgData.data[i] > 0) return true; // Found a non-transparent pixel
  }
  return false; // Character is empty
};

/**
 * Fetches and parses the CSV files for glyph names and categories.
 */
export const fetchGlyphData = async (): Promise<{
  glyphNames: Map<number, string>;
  categories: { name: string; start: number; end: number }[];
}> => {
  // Load names
  const namesResponse = await fetch("/Unicode-Categories.csv");
  const namesText = await namesResponse.text();
  const glyphNames = new Map<number, string>();
  namesText.split("\n").forEach((line) => {
    const [code, name] = line.split(";");
    if (code && name) glyphNames.set(parseInt(code, 16), name);
  });

  // Load categories
  const catResponse = await fetch("/unicode-names-list.csv");
  const catText = await catResponse.text();
  const categories: { name: string; start: number; end: number }[] = [];
  catText
    .split("\n")
    .slice(1)
    .forEach((line) => {
      const [name, start, end] = line.split(",");
      if (name && start && end) {
        categories.push({
          name,
          start: parseInt(start.replace("U+", ""), 16),
          end: parseInt(end.replace("U+", ""), 16),
        });
      }
    });

  return { glyphNames, categories };
};

/**
 * Random Alphanumeric Serial (Timestamp + Random)
 */
export const generateRandomSerial = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${timestamp}-${randomPart}`;
};
