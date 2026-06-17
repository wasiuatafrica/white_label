const styleDesc: Record<string, string> = {
  modern: 'minimalist, clean lines, geometric shapes, modern sans-serif, professional',
  bold: 'strong, impactful, thick letterforms, high contrast, powerful, confident',
  elegant: 'sophisticated, refined, serif typography, luxury, premium, timeless',
};

export function buildLogoPrompt(firmName: string, style: string, brandColor?: string): string {
  const styleHint = styleDesc[style] || styleDesc.modern;
  const colorHint = brandColor ? `, primary color ${brandColor}` : '';

  return `Professional logo for "${firmName}" prop trading firm. ${styleHint}${colorHint}. Square format, centered, clean white background. Trading/finance theme with abstract symbols (charts, growth arrows, geometric patterns). Icon only, no text. High quality, vector-style.`;
}
