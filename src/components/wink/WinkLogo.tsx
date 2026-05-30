import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { withWordmark?: boolean };

export function WinkLogo({ withWordmark = false, className, ...rest }: Props) {
  if (withWordmark) {
    return (
      <svg
        viewBox="0 0 480 120"
        fill="none"
        className={className}
        aria-label="Wink"
        {...rest}
      >
        <ellipse cx="40" cy="64" rx="22" ry="22" stroke="currentColor" strokeWidth="6" />
        <circle cx="40" cy="64" r="8" fill="var(--wink)" />
        <path
          d="M76 64 Q96 50 116 64"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <text
          x="160"
          y="92"
          fontFamily="Fraunces, serif"
          fontSize="80"
          fontWeight="600"
          letterSpacing="-4"
          fill="currentColor"
        >
          wink
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 180 180" fill="none" className={className} aria-label="Wink" {...rest}>
      <ellipse cx="62" cy="92" rx="22" ry="22" stroke="currentColor" strokeWidth="6" />
      <circle cx="62" cy="92" r="8" fill="var(--wink)" />
      <path
        d="M100 92 Q120 78 140 92"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
