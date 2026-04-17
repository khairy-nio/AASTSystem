"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LogIn, LogOut, User, Calendar, Search, Settings,
  Users, LayoutDashboard, GitMerge, Menu, X, Building2
} from "lucide-react";

type UserProfile = {
  full_name: string;
  role: string;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  BRANCH_MANAGER: "Branch Manager",
  SECRETARY: "Secretary",
  EMPLOYEE: "Employee",
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-red-500/20 text-red-200 border border-red-400/30",
  BRANCH_MANAGER: "bg-purple-500/20 text-purple-200 border border-purple-400/30",
  SECRETARY: "bg-blue-500/20 text-blue-200 border border-blue-400/30",
  EMPLOYEE: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30",
};

const adminLinks = [
  { href: "/dashboard", label: "Requests", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/admin/search", label: "Room Search", icon: Search },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/delegations", label: "Delegations", icon: GitMerge },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
];

export default function Navbar() {
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUser(user ? { id: user.id } : null);
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
      setLoadingAuth(false);
    };
    fetchAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { setAuthUser(null); setProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const linkCls = (href: string, exact = false) =>
    `flex items-center gap-1.5 text-sm px-3 py-2 rounded-md font-medium transition-colors ${
      isActive(href, exact)
        ? "bg-white/20 text-white"
        : "text-slate-300 hover:text-white hover:bg-white/10"
    }`;

  return (
    <nav className="bg-primary shadow-lg w-full z-50 sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <Link
            href={authUser ? "/dashboard" : "/"}
            className="font-bold text-xl tracking-tight flex items-center gap-2 flex-shrink-0"
          >
            <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center border border-secondary/30">
              <Building2 className="w-4 h-4 text-secondary" />
            </div>
            <span>
              <span className="text-secondary font-extrabold">AAST</span>
              <span className="text-white">Sys</span>
            </span>
          </Link>

          {/* Desktop admin navigation */}
          {authUser && profile?.role === "ADMIN" && (
            <div className="hidden lg:flex items-center gap-0.5">
              {adminLinks.map(({ href, label, icon: Icon, exact }) => (
                <Link key={href} href={href} className={linkCls(href, exact)}>
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right: user info + actions */}
          <div className="flex items-center gap-3">
            {!loadingAuth && authUser && profile ? (
              <>
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white leading-tight">{profile.full_name}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLOR[profile.role] ?? "bg-gray-200/20 text-gray-200"}`}>
                      {ROLE_LABEL[profile.role] ?? profile.role}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-secondary/20 border-2 border-secondary/40 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-white/20 text-sm font-medium rounded-lg text-white hover:bg-white/10 focus:outline-none transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
                {/* Mobile hamburger for admin */}
                {profile.role === "ADMIN" && (
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="lg:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Toggle navigation"
                  >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                )}
              </>
            ) : !loadingAuth && !authUser ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg text-primary bg-secondary hover:bg-yellow-400 transition-colors shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            ) : (
              <div className="w-20 h-8 bg-white/10 rounded-lg animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Mobile admin menu */}
      {mobileOpen && authUser && profile?.role === "ADMIN" && (
        <div className="lg:hidden border-t border-white/10 bg-primary/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-1">
            {adminLinks.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href, exact)
                    ? "bg-white/20 text-white"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
