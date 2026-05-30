import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Crumb = { label: string; to?: string };

type AdminHeaderProps = {
  crumbs: Crumb[];
  right?: ReactNode;
};

export function AdminHeader({ crumbs, right }: AdminHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {crumb.to ? (
              <Link
                to={crumb.to}
                className="transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}
