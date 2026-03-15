"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "League Table", icon: "🏆" },
  { href: "/competitions", label: "Competitions", icon: "📋" },
  { href: "/competitions/new", label: "Enter Results", icon: "✏️" },
  { href: "/players", label: "Players", icon: "👩" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-green-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span>⛳</span>
            <span>Winter League</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-green-900 text-white"
                    : "hover:bg-green-600 text-green-100"
                }`}
              >
                <span className="mr-1">{link.icon}</span>
                {link.label}
              </Link>
            ))}

            <a
              href="/api/export"
              className="ml-2 px-3 py-2 rounded-lg text-sm font-medium bg-yellow-500 hover:bg-yellow-400 text-green-900 transition-colors"
            >
              📥 Export
            </a>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-900 hover:bg-green-800 transition-colors"
            >
              Sign out
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-green-600"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-green-900 text-white"
                    : "hover:bg-green-600 text-green-100"
                }`}
              >
                <span className="mr-1">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <a
              href="/api/export"
              className="block px-3 py-2 rounded-lg text-sm font-medium bg-yellow-500 hover:bg-yellow-400 text-green-900 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              📥 Export Excel
            </a>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium bg-green-900 hover:bg-green-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
