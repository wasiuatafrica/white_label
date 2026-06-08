// FT9ja Logo — SVG, transparent background
// Usage: <FT9jaLogo className="h-10 w-auto" /> or <FT9jaLogo height={40} dark />

interface FT9jaLogoProps {
  className?: string;
  height?: number;
  dark?: boolean; // true = white text for dark backgrounds
}

export default function FT9jaLogo({ className, height = 40, dark = false }: FT9jaLogoProps) {
  const textColor = dark ? '#FFFFFF' : '#111827';
  const accentColor = '#16A34A';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 44"
      height={height}
      className={className}
      style={{ display: 'block' }}
      aria-label="FT9ja"
    >
      {/* Green chart bars icon */}
      <rect x="0" y="20" width="7" height="24" rx="2" fill={accentColor} opacity="0.4" />
      <rect x="10" y="12" width="7" height="32" rx="2" fill={accentColor} opacity="0.6" />
      <rect x="20" y="4" width="7" height="40" rx="2" fill={accentColor} />

      {/* Rising arrow line */}
      <polyline
        points="2,38 14,22 24,10"
        fill="none"
        stroke={accentColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="10" r="2.5" fill={accentColor} />

      {/* FT9ja wordmark */}
      <text
        x="36"
        y="32"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="900"
        fontSize="26"
        letterSpacing="-0.5"
        fill={textColor}
      >
        FT
      </text>
      <text
        x="81"
        y="32"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="900"
        fontSize="26"
        letterSpacing="-0.5"
        fill={accentColor}
      >
        9ja
      </text>
    </svg>
  );
}
