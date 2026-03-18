"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { format } from "date-fns";

interface Competition {
  id: string;
  name: string | null;
  date: string;
  topPlaces: number;
  league: {
    id: string;
    name: string;
    season: {
      id: string;
      year: number;
    };
  };
  results: {
    id: string;
    player: { name: string };
    score: number;
    place: number;
  }[];
}

interface LeagueGroup {
  leagueId: string;
  leagueName: string;
  seasonYear: number;
  competitions: Competition[];
  mostRecentDate: Date;
}

function CompetitionsContent() {
  const searchParams = useSearchParams();
  const selectedSeason = searchParams.get("season");

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [leagueGroups, setLeagueGroups] = useState<LeagueGroup[]>([]);
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitions();
  }, [selectedSeason]);

  async function fetchCompetitions() {
    try {
      setLoading(true);
      const url = selectedSeason
        ? `/api/competitions?seasonId=${selectedSeason}`
        : '/api/competitions';

      const res = await fetch(url);
      const data: Competition[] = await res.json();
      setCompetitions(data);

      // Group by league and sort by most recent competition
      const groups = data.reduce((acc, comp) => {
        const leagueId = comp.league.id;
        if (!acc[leagueId]) {
          acc[leagueId] = {
            leagueId,
            leagueName: comp.league.name,
            seasonYear: comp.league.season.year,
            competitions: [],
            mostRecentDate: new Date(0),
          };
        }
        acc[leagueId].competitions.push(comp);

        const compDate = new Date(comp.date);
        if (compDate > acc[leagueId].mostRecentDate) {
          acc[leagueId].mostRecentDate = compDate;
        }

        return acc;
      }, {} as Record<string, LeagueGroup>);

      // Sort competitions within each league by date (most recent first)
      Object.values(groups).forEach(group => {
        group.competitions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });

      // Sort league groups by most recent competition date (most recent first)
      const sortedGroups = Object.values(groups).sort((a, b) =>
        b.mostRecentDate.getTime() - a.mostRecentDate.getTime()
      );

      setLeagueGroups(sortedGroups);
    } catch (err) {
      console.error("Failed to fetch competitions:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleLeague(leagueId: string) {
    const newCollapsed = new Set(collapsedLeagues);
    if (newCollapsed.has(leagueId)) {
      newCollapsed.delete(leagueId);
    } else {
      newCollapsed.add(leagueId);
    }
    setCollapsedLeagues(newCollapsed);
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">Loading competitions...</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Competitions</h1>
          <p className="text-gray-500 mt-1">
            {competitions.length} competition
            {competitions.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/competitions/new"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors w-fit"
        >
          ✏️ Enter Results
        </Link>
      </div>

      {competitions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No competitions yet
          </h2>
          <p className="text-gray-500 mb-6">
            Enter your first competition to get started.
          </p>
          <Link
            href="/competitions/new"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Enter Results
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {leagueGroups.map((group) => {
            const isCollapsed = collapsedLeagues.has(group.leagueId);
            return (
              <div key={group.leagueId} className="bg-white rounded-xl shadow overflow-hidden">
                {/* League header */}
                <button
                  onClick={() => toggleLeague(group.leagueId)}
                  className="w-full px-6 py-4 bg-green-50 hover:bg-green-100 transition-colors text-left flex items-center justify-between"
                >
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <span className="text-2xl">
                        {isCollapsed ? "▶️" : "▼️"}
                      </span>
                      {group.leagueName}
                      <span className="text-sm bg-green-200 text-green-800 px-2 py-1 rounded-full">
                        {group.seasonYear}
                      </span>
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {group.competitions.length} competition{group.competitions.length !== 1 ? "s" : ""} •
                      Most recent: {format(group.mostRecentDate, "d MMM yyyy")}
                    </p>
                  </div>
                  <div className="text-gray-400">
                    Click to {isCollapsed ? "expand" : "collapse"}
                  </div>
                </button>

                {/* Competitions list */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {group.competitions.map((comp) => {
                      const winner = comp.results.find((r) => r.place === 1);
                      return (
                        <Link
                          key={comp.id}
                          href={`/competitions/${comp.id}`}
                          className="block hover:bg-gray-50 transition-colors p-6"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {comp.name || `Competition on ${format(new Date(comp.date), "d MMM yyyy")}`}
                              </h3>
                              <p className="text-gray-500 text-sm mt-0.5">
                                📅 {format(new Date(comp.date), "EEEE d MMMM yyyy")}
                              </p>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                {comp.results.length} entries
                              </span>
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                Top {comp.topPlaces}
                              </span>
                            </div>
                          </div>
                          {winner && (
                            <div className="mt-3 text-sm text-gray-600">
                              🥇 Winner:{" "}
                              <span className="font-medium text-green-700">
                                {winner.player.name}
                              </span>{" "}
                              (score: {winner.score})
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function CompetitionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <Navbar />
      </Suspense>
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8">Loading...</div>}>
        <CompetitionsContent />
      </Suspense>
    </div>
  );
}
