"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/", label: "League Table", icon: "🏆" },
  { href: "/competitions", label: "Competitions", icon: "📋" },
  { href: "/competitions/new", label: "Enter Results", icon: "✏️" },
  { href: "/players", label: "Players", icon: "👩" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [seasons, setSeasons] = useState<{ id: string; year: number }[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("");

  useEffect(() => {
    // Fetch available seasons
    fetch("/api/seasons")
      .then((res) => res.json())
      .then((data) => {
        setSeasons(data);
        // Set default season to current year or most recent
        const currentYear = new Date().getFullYear();
        const currentSeason = data.find((s: any) => s.year === currentYear);
        const defaultSeason = currentSeason || data[0];

        const seasonParam = searchParams.get("season");
        if (seasonParam) {
          setSelectedSeason(seasonParam);
        } else if (defaultSeason) {
          setSelectedSeason(defaultSeason.id);
        }
      })
      .catch((err) => console.error("Failed to fetch seasons:", err));
  }, []);

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeason(seasonId);
    // Update URL with season parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", seasonId);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Helper function to create URL with season parameter
  const createLinkWithSeason = (href: string) => {
    if (!selectedSeason) return href;
    const url = new URL(href, window.location.origin);
    url.searchParams.set('season', selectedSeason);
    return url.pathname + url.search;
  };

  // Helper function to create export URL with season
  const createExportUrl = () => {
    if (!selectedSeason) return '/api/export';
    return `/api/export?seasonId=${selectedSeason}`;
  };

  return (
    <nav className="bg-green-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={createLinkWithSeason("/")}
            className="flex items-center gap-2 font-bold text-lg"
          >
            <span>⛳</span>
            <span>Winter League</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Season selector */}
            {seasons.length > 0 && (
              <select
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="px-2 py-1 rounded-lg text-sm font-medium bg-green-800 border border-green-600 hover:bg-green-600 transition-colors mr-2"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.year} Season
                  </option>
                ))}
              </select>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={createLinkWithSeason(link.href)}
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
              href={createExportUrl()}
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
            {/* Season selector for mobile */}
            {seasons.length > 0 && (
              <select
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-green-800 border border-green-600 mb-2"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.year} Season
                  </option>
                ))}
              </select>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={createLinkWithSeason(link.href)}
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
              href={createExportUrl()}
              className="block px-3 py-2 rounded-lg text-sm font-medium bg-yellow-500 hover:bg-yellow-400 text-green-900 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              📥 Export
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
