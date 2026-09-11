import React from "react";

export type LogoVariant = "full" | "standard" | "icon";

export interface LogoProps {
  /** Logo variant: 'full' (default), 'standard', or 'icon' */
  variant?: LogoVariant;
  /** Custom CSS classes for dimensions and styling */
  className?: string;
  /** Width dimension attribute */
  width?: number;
  /** Height dimension attribute */
  height?: number;
  /** Custom alt text */
  alt?: string;
}

const LOGO_SOURCES: Record<LogoVariant, string> = {
  full: "/assets/tatt-logo-full.webp",
  standard: "/assets/tatt-logo.webp",
  icon: "/assets/tattlogoIcon.svg",
};

export function TATTLogo({
  variant = "full",
  className = "object-contain w-fit h-10",
  width = 40,
  height = 40,
  alt = "TATT Logo",
}: LogoProps) {
  const src = LOGO_SOURCES[variant] ?? LOGO_SOURCES.full;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
