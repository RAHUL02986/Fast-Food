"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import BrandLogo from "@/components/Logo";

/* ---------------- shared helpers ---------------- */

const drawerLinkClass = (active: boolean) =>
  `flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium transition ${
    active ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-gray-50 hover:text-orange-600"
  }`;

function Chevron() {
  return <ChevronRight size={16} className="shrink-0 text-gray-300" />;
}

/** Small avatar chip reused by the desktop navs. */
function Avatar({ name }: { name?: string }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
      {name?.charAt(0)?.toUpperCase() || "U"}
    </span>
  );
}

/** Avatar + name + email chip (desktop navs) and a mobile (drawer) variant. */
function AccountChip({ user }: { user?: { name?: string; email?: string; role?: string } | null }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={user?.name} />
      <span className="flex flex-col leading-tight">
        <span>{user?.name?.split(" ")[0] || "Account"}</span>
        {user?.email && <span className="max-w-[140px] truncate text-[11px] text-gray-400">{user.email}</span>}
      </span>
    </span>
  );
}

/** Header "Sign up" dropdown — Customer vs Restaurant Owner. */
function SignupDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-lg bg-orange-600 px-4 py-1.5 font-semibold text-white transition hover:bg-orange-700"
      >
        Sign up <ChevronDown size={14} className={open ? "rotate-180 transition" : "transition"} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white py-2 shadow-2xl">
          <Link
            href="/signup?role=customer"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-orange-50"
          >
            <span className="text-xl">👤</span>
            <span>
              <span className="block font-semibold">Sign up as Customer</span>
              <span className="block text-xs text-gray-500">Order food, book tables &amp; track deliveries</span>
            </span>
          </Link>
          <div className="my-1 h-px bg-gray-100" />
          <Link
            href="/signup?role=owner"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-orange-50"
          >
            <span className="text-xl">🍽️</span>
            <span>
              <span className="block font-semibold">Sign up as Restaurant Owner</span>
              <span className="block text-xs text-gray-500">List your restaurant, manage menu &amp; orders</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

const customerLinks = [
  { href: "/", label: "Home" },
  { href: "/restaurants", label: "Discover" },
  { href: "/bookings/book", label: "Book a Table" },
  { href: "/orders", label: "My Orders" },
  { href: "/bookings", label: "My Bookings" },
];

/* ---------------- mobile drawer (slides in right → left) ---------------- */

function MobileDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    // Kept mounted (hidden on desktop) so the slide-out animation plays when closing
    <div className={`md:hidden ${open ? "" : "pointer-events-none"}`}>
      {/* dimmed backdrop — tap anywhere to close */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* panel slides in from the right edge. When closed it is aria-hidden AND
          invisible — visibility:hidden removes the links/buttons from the tab
          order and accessibility tree (a closed drawer must not expose
          focusable descendants), while still letting the slide animation play. */}
      <aside
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0 visible" : "translate-x-full invisible"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {title || "Menu"}
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{children}</nav>
      </aside>
    </div>
  );
}

/** Hamburger toggle shown on mobile (< md). */
function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open menu"
      className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition hover:bg-orange-50 hover:text-orange-600 md:hidden"
    >
      <Menu size={22} />
    </button>
  );
}

export function CustomerNav({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer whenever the route changes
  useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // "Book a Table" (/bookings/book) is its own item; "My Bookings" covers /bookings and /bookings/[id]
    if (href === "/bookings") return pathname === "/bookings" || (pathname.startsWith("/bookings/") && pathname !== "/bookings/book");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkCls = (href: string) =>
    `font-medium transition ${
      isActive(href) ? "text-orange-600" : "text-gray-700 hover:text-orange-600"
    }`;

  const dashboardHref =
    user?.role === "admin" ? "/admin" : user?.role === "owner" ? "/owner/dashboard" : "/dashboard";

  return (
    <nav className="sticky top-0 z-30 bg-white shadow">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <BrandLogo href="/" />

        {/* desktop links */}
        <div className="hidden items-center gap-x-4 text-sm md:flex">
          {customerLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkCls(link.href)}>
              {link.label}
            </Link>
          ))}
          {user?.role === "owner" || user?.role === "admin" ? (
            <Link href={dashboardHref} className={linkCls(dashboardHref)}>
              {user.role === "admin" ? "Admin" : "Restaurant"}
            </Link>
          ) : null}
          {user?.isDeliveryPartner ? (
            <Link href="/delivery" className={linkCls("/delivery")}>
              Delivery
            </Link>
          ) : null}
          {children}
          {user ? (
            <>
              <Link href="/profile" className={`flex items-center gap-2 ${linkCls("/profile")}`}>
                <AccountChip user={user} />
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="font-medium text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-gray-700 hover:text-orange-600">
                Login
              </Link>
              <SignupDropdown />
            </>
          )}
        </div>

        {/* mobile bar: cart + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {children}
          <HamburgerButton onClick={() => setMenuOpen(true)} />
        </div>
      </div>

      {/* mobile drawer */}
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Quick Food">
        {customerLinks.map((link) => (
          <Link key={link.href} href={link.href} className={drawerLinkClass(isActive(link.href))}>
            {link.label}
            <Chevron />
          </Link>
        ))}
        {user?.role === "owner" || user?.role === "admin" ? (
          <Link href={dashboardHref} className={drawerLinkClass(isActive(dashboardHref))}>
            {user.role === "admin" ? "Admin Dashboard" : "Restaurant Dashboard"}
            <Chevron />
          </Link>
        ) : null}
        {user?.isDeliveryPartner ? (
          <Link href="/delivery" className={drawerLinkClass(isActive("/delivery"))}>
            Delivery Dashboard
            <Chevron />
          </Link>
        ) : null}
        {user ? (
          <>
            <Link href="/profile" className={drawerLinkClass(isActive("/profile"))}>
              <AccountChip user={user} />
              <Chevron />
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium text-red-600 transition hover:bg-red-50"
            >
              Logout
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <div className="space-y-1 px-1 pb-2 pt-2">
            <Link
              href="/login"
              className="block rounded-xl border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              Login
            </Link>
            <Link
              href="/signup?role=customer"
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl bg-orange-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-orange-700"
            >
              Sign up as Customer
            </Link>
            <Link
              href="/signup?role=owner"
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl border-2 border-orange-600 px-4 py-3 text-center font-semibold text-orange-600 transition hover:bg-orange-50"
            >
              Sign up as Restaurant Owner
            </Link>
          </div>
        )}
      </MobileDrawer>
    </nav>
  );
}

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/restaurants", label: "Restaurants" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/delivery", label: "Delivery" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/reports", label: "Reports" },
];

export function AdminNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer whenever the route changes
  useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  const linkCls = (href: string) =>
    `font-medium transition ${
      isActive(href) ? "text-orange-600" : "text-gray-700 hover:text-orange-600"
    }`;

  return (
    <nav className="sticky top-0 z-30 bg-white shadow">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <BrandLogo href="/admin" text="Quick Food Admin" />

        {/* desktop links */}
        <div className="hidden items-center gap-x-4 text-sm md:flex">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkCls(link.href)}>
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <Link href="/profile" className={`flex items-center gap-2 ${linkCls("/profile")}`}>
                <AccountChip user={user} />
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="font-medium text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* mobile hamburger */}
        <HamburgerButton onClick={() => setMenuOpen(true)} />
      </div>

      {/* mobile drawer */}
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Admin Menu">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href} className={drawerLinkClass(isActive(link.href))}>
            {link.label}
            <Chevron />
          </Link>
        ))}
        {user && (
          <>
            <Link href="/profile" className={drawerLinkClass(isActive("/profile"))}>
              <AccountChip user={user} />
              <Chevron />
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium text-red-600 transition hover:bg-red-50"
            >
              Logout
              <LogOut size={16} />
            </button>
          </>
        )}
      </MobileDrawer>
    </nav>
  );
}

const ownerLinks = [
  { href: "/owner/dashboard", label: "Dashboard" },
  { href: "/owner/orders", label: "Orders" },
  { href: "/owner/menu", label: "Menu" },
  { href: "/owner/tables", label: "Tables & Slots" },
  { href: "/owner/bookings", label: "Bookings" },
  { href: "/owner/analytics", label: "Analytics" },
];

export function OwnerNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer whenever the route changes
  useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkCls = (href: string) =>
    `font-medium transition ${
      isActive(href) ? "text-orange-600" : "text-gray-700 hover:text-orange-600"
    }`;

  return (
    <nav className="sticky top-0 z-30 bg-white shadow">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <BrandLogo href="/owner/dashboard" text="Quick Food" />

        {/* desktop links */}
        <div className="hidden items-center gap-x-4 text-sm md:flex">
          {ownerLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkCls(link.href)}>
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <Link href="/profile" className={`flex items-center gap-2 ${linkCls("/profile")}`}>
                <AccountChip user={user} />
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="font-medium text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* mobile hamburger */}
        <HamburgerButton onClick={() => setMenuOpen(true)} />
      </div>

      {/* mobile drawer */}
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Restaurant Menu">
        {ownerLinks.map((link) => (
          <Link key={link.href} href={link.href} className={drawerLinkClass(isActive(link.href))}>
            {link.label}
            <Chevron />
          </Link>
        ))}
        {user && (
          <>
            <Link href="/profile" className={drawerLinkClass(isActive("/profile"))}>
              <AccountChip user={user} />
              <Chevron />
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium text-red-600 transition hover:bg-red-50"
            >
              Logout
              <LogOut size={16} />
            </button>
          </>
        )}
      </MobileDrawer>
    </nav>
  );
}