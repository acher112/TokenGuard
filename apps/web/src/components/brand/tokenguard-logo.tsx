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
export function TokenGuardIcon({ className = "w-8 h-8", size }: TokenGuardIconProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 120 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="TokenGuard Logo"
    >
      <defs>
        <linearGradient id="tg-t-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4338CA" />
          <stop offset="40%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="tg-g-grad" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* Letter T with curving right arc */}
      <path
        d="M 6 14
           H 40
           C 54 24, 62 38, 62 52
           C 62 66, 54 80, 40 86
           H 20
           V 34
           H 6
           Z"
        fill="url(#tg-t-grad)"
      />

      {/* Letter G cradling the arc of T with clean negative space gap */}
      <path
        d="M 46 14
           C 78 14, 114 26, 114 52
           C 114 78, 78 88, 46 88
           C 54 82, 60 74, 64 66
           C 80 66, 94 60, 94 52
           C 94 44, 80 36, 64 36
           C 60 28, 54 20, 46 14
           Z
           M 66 45
           H 114
           V 59
           H 84
           V 59
           H 66
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
