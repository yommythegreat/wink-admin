import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { WinkLogo } from "@/components/wink/WinkLogo";
import { ThemeToggle } from "@/components/wink/ThemeToggle";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header
        className="flex items-center justify-end px-6 pt-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
      >
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-sm text-center">
          <Link to="/" aria-label="Wink home" className="mx-auto mb-6 inline-flex text-foreground">
            <WinkLogo className="h-24 w-24" />
          </Link>
          <h1 className="font-display text-[44px] leading-[1.02]">{title}</h1>
          {subtitle && (
            <p className="mt-4 text-base text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-10 text-left">{children}</div>
        </div>
      </main>

      {footer && (
        <footer
          className="px-6 pb-8 text-center text-sm text-muted-foreground"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
        >
          <div className="mx-auto w-full max-w-sm">{footer}</div>
        </footer>
      )}
    </div>
  );
}
