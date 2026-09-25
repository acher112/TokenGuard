import React from "react";
import Link from "next/link";

interface TokenGuardIconProps {
  className?: string;
  size?: number | string;
}

/**
 * TokenGuard Vector Brand Icon
 * Precision mathematical SVG reproduction of the modern interlocking TG monogram.
 */
export function TokenGuardIcon({ className = "w-9 h-7", size }: TokenGuardIconProps) {
  const style = size ? { width: size, height: typeof size === "number" ? size * 0.75 : undefined } : undefined;

  return (
    <svg
      viewBox="0 0 110 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="TokenGuard TG Logo"
    >
      <defs>
        <linearGradient id="tg-t-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4338CA" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="tg-g-grad" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* Bold Letter T */}
      <path
        d="M 4 8 
           H 48 
           V 26 
           H 34 
           V 74 
           H 16 
           V 26 
           H 4 
           Z"
        fill="url(#tg-t-grad)"
      />

      {/* Bold Letter G */}
      <path
        d="M 52 8 
           C 80 8 102 22 102 42 
           C 102 62 80 74 52 74 
           H 40 
           V 56 
           H 54 
           C 70 56 82 50 82 42 
           C 82 32 70 24 54 24 
           H 52 
           Z 
           M 58 35 
           H 100 
           V 49 
           H 74 
           V 49 
           H 58 
           Z"
        fill="url(#tg-g-grad)"
      />
    </svg>
  );
}

interface TokenGuardLogoProps {
  className?: string;
  iconSize?: number | string;
  showSubtitle?: boolean;
  href?: string;
  onClick?: () => void;
}

/**
 * TokenGuard Complete Brand Logo with Monogram Icon + Wordmark
 */
export function TokenGuardLogo({
  className = "",
  iconSize = 32,
  showSubtitle = false,
  href,
  onClick,
}: TokenGuardLogoProps) {
  const content = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      <div className="shrink-0 transition-transform duration-200 group-hover:scale-105">
        <TokenGuardIcon size={iconSize} className="h-auto" />
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex items-center font-bold tracking-tight text-foreground leading-none text-base sm:text-lg">
          <span>Token</span>
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Guard
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mt-0.5">
            AI Observability
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
