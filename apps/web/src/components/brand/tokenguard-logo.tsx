import React from "react";
import Link from "next/link";

interface TokenGuardIconProps {
  className?: string;
  size?: number | string;
}

/**
 * TokenGuard Brand Icon
 * Uses the exact TG monogram image with transparent background.
 */
export function TokenGuardIcon({ className = "h-8 w-auto", size = 32 }: TokenGuardIconProps) {
  const heightStyle = typeof size === "number" ? `${size}px` : size;

  return (
    <img
      src="/brand/tg-logo.png"
      alt="TokenGuard TG Logo"
      className={`object-contain shrink-0 select-none ${className}`}
      style={{ height: heightStyle, width: "auto" }}
      loading="eager"
    />
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
