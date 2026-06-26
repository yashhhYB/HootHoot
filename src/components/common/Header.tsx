"use client";

import { navbarConfig } from "@/data/Header";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

// Simple hamburger icon with CSS transitions
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="w-5 h-4 flex flex-col justify-between relative" aria-hidden="true">
      <span
        className={cn(
          "block h-0.5 bg-foreground rounded-full transition-all duration-200 origin-center",
          open && "rotate-45 translate-y-[7.5px]"
        )}
      />
      <span
        className={cn(
          "block h-0.5 bg-foreground rounded-full transition-all duration-150",
          open && "opacity-0 scale-x-0"
        )}
      />
      <span
        className={cn(
          "block h-0.5 bg-foreground rounded-full transition-all duration-200 origin-center",
          open && "-rotate-45 -translate-y-[7.5px]"
        )}
      />
    </div>
  );
}

// Removed streak badge function

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const user = useUser();
  const pathname = usePathname();

  const altText = pathname === "/" ? "Hoot-Hoot" : "Dashboard";

  // Close menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    window.location.reload();
  }, []);

  const close = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      {/* Tap-outside backdrop (mobile only) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-200"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <header className="fixed top-0 inset-x-0 z-50 flex flex-col items-center">
        {/* Full-width navbar */}
        <div
          className={cn(
            "w-full flex items-center justify-between px-6 h-16 border-b transition-colors duration-300",
            scrolled || mobileOpen
              ? "bg-black/80 backdrop-blur-md border-white/10 shadow-lg"
              : "bg-transparent border-transparent"
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="relative w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-105">
              <Image
                src={navbarConfig.logo.src}
                alt="Hoot-Hoot logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="font-black text-xl md:text-2xl tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              {altText}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navbarConfig.navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const isArena = item.href === "/arena";
              const isCompany = item.href === "/company";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "relative text-sm font-medium py-1.5 px-3 rounded-lg transition-colors duration-200 flex items-center gap-1.5",
                    isActive
                      ? "text-foreground bg-white/10"
                      : "text-foreground/60 hover:text-foreground hover:bg-white/5",
                    isArena && !isActive && "hover:text-purple-300 hover:bg-purple-500/10",
                    isArena && isActive && "text-purple-300 bg-purple-500/15",
                    isCompany && !isActive && "text-foreground/60 hover:text-foreground hover:bg-white/5"
                  )}
                  style={isArena && !isActive ? { color: "#d8cce4" } : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-3">

            {/* Auth — only show avatar when signed in; sign-in is at /arena/auth */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 w-9 rounded-full p-0 border border-border/50 hover:border-border transition-colors"
                  >
                    <Avatar className="h-8 w-8 border border-border/40">
                      <AvatarImage src={user.image || undefined} alt={user.email} />
                      <AvatarFallback className="bg-muted text-foreground text-xs">
                        {user.email?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {user.name && <p className="text-sm font-medium truncate">{user.name}</p>}
                    </div>
                    {user.email && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    className="text-red-500 focus:text-red-500 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <HamburgerIcon open={mobileOpen} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden absolute top-[72px] inset-x-4 rounded-2xl bg-background/95 border border-border/50 shadow-2xl overflow-hidden">
            {/* Nav links */}
            <nav className="flex flex-col p-3 gap-1">
              {navbarConfig.navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const isArena = item.href === "/arena";
                const isCompany = item.href === "/company";
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150",
                      isActive
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isArena && !isActive && "text-purple-400/80 hover:text-purple-300 hover:bg-purple-500/10"
                    )}
                  >
                    {isActive && <span className="w-1 h-4 bg-foreground rounded-full shrink-0" />}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Divider + user profile */}
            <div className="px-4 pb-4 pt-1 border-t border-border/40 flex flex-col gap-6">
              {user && (
                <div className="flex items-center gap-3 px-1">
                  <Avatar className="h-8 w-8 border border-border/40 shrink-0">
                    <AvatarImage src={user.image || undefined} alt={user.email} />
                    <AvatarFallback className="bg-muted text-foreground text-xs">
                      {user.email?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {user.name && <p className="text-sm font-medium truncate">{user.name}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-red-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default React.memo(Navbar);
