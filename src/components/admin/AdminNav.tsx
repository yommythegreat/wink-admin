import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  CreditCard,
  LogOut,
  UserCog,
  BookOpen,
  Settings2,
  MapPin,
  Tags,
  Sparkles,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useAdminRole } from "@/hooks/use-admin-role";
import { Badge } from "@/components/ui/badge";

export function AdminNav() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { role } = useAdminRole();

  const navItems = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Users", icon: Users, exact: false },
    { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert, exact: false },
    { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard, exact: false },
    // Wink Spots admin surfaces, grouped by data model order:
    // Cities → Categories → Spots → Suggestions queue → Analytics.
    { to: "/admin/cities", label: "Cities", icon: MapPin, exact: false },
    { to: "/admin/categories", label: "Categories", icon: Tags, exact: false },
    { to: "/admin/spots", label: "Spots", icon: Sparkles, exact: false },
    { to: "/admin/spot-suggestions", label: "Spot suggestions", icon: Lightbulb, exact: false },
    { to: "/admin/spot-analytics", label: "Spot analytics", icon: BarChart3, exact: false },
    { to: "/admin/config", label: "Configurations", icon: Settings2, exact: false },
    { to: "/admin/guide", label: "Product Guide", icon: BookOpen, exact: false },
    ...(role === "SUPER_ADMIN"
      ? [{ to: "/admin/admins", label: "Admin Team", icon: UserCog, exact: false }]
      : []),
  ];

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="font-display text-xl font-semibold tracking-tight text-foreground">
          wink
        </span>
        <Badge variant="secondary" className="text-[10px]">
          Admin
        </Badge>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer — current admin email + sign out */}
      <div className="border-t border-border px-4 py-4">
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        <button
          onClick={() => signOut()}
          className="mt-2 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
