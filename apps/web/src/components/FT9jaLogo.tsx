const LOGO_URL = 'https://res.cloudinary.com/ddlupbcws/image/upload/v1781211105/logo_trg4xb.png';

// FT9ja Logo
// Usage: <FT9jaLogo className="h-10 w-auto" /> or <FT9jaLogo height={40} dark />

interface FT9jaLogoProps {
  className?: string;
  height?: number;
  dark?: boolean; // true = white text for dark backgrounds
}

export default function FT9jaLogo({ className, height = 40, dark = false }: FT9jaLogoProps) {
  return (
    <img
      src={LOGO_URL}
      alt="FT9ja"
      height={height}
      className={className}
      style={{ display: 'block', height, width: 'auto' }}
      data-theme={dark ? 'dark' : 'light'}
    />
  );
}
