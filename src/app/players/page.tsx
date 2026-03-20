"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { pointsForPlace } from "@/lib/scoring";

interface Player {
  id: string;
  name: string;
  results: {
    id: string;
    place: number;
    score: number;
    competition: {
      id: string;
      name: string | null;
      date: string;
      topPlaces: number;
      seasonId: string;
      leagueId: string;
    };
  }[];
}

function PlayersContent() {
  const searchParams = useSearchParams();
  const selectedSeason = searchParams.get("season");

  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      // Filter players to only show those with results in the selected season
      const filtered = players.map(player => ({
        ...player,
        results: player.results.filter(result => result.competition.seasonId === selectedSeason)
      })).filter(player => player.results.length > 0); // Only show players with results in this season

      setFilteredPlayers(filtered);
    } else {
      setFilteredPlayers(players);
    }
  }, [players, selectedSeason]);

  async function fetchPlayers() {
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      setPlayers(data);
    } catch (err) {
      console.error("Failed to fetch players:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">Loading players...</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Players</h1>
        <p className="text-gray-500 mt-1">
          {filteredPlayers.length} player{filteredPlayers.length !== 1 ? "s" : ""}
          {selectedSeason ? " in selected season" : " registered"}
        </p>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">👩</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {selectedSeason ? "No players in this season" : "No players yet"}
          </h2>
          <p className="text-gray-500 mb-6">
            {selectedSeason
              ? "No players have competed in the selected season yet."
              : "Players are added automatically when you enter competition results."
            }
          </p>
          <Link
            href="/competitions/new"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Enter Results
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => {
            const totalPoints = player.results.reduce(
              (sum, r) => sum + pointsForPlace(r.place, r.competition.topPlaces),
              0
            );
            const topPlacements = player.results.filter((r) => r.place <= r.competition.topPlaces);
            const wins = player.results.filter((r) => r.place === 1).length;

            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="block bg-white rounded-xl shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                    {player.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {player.name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {player.results.length} competition
                      {player.results.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xl font-bold text-green-700">
                      {totalPoints}
                    </div>
                    <div className="text-xs text-gray-500">Points</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-yellow-600">
                      {wins}
                    </div>
                    <div className="text-xs text-gray-500">Wins</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600">
                      {topPlacements.length}
                    </div>
                    <div className="text-xs text-gray-500">Top places</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function PlayersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <Navbar />
      </Suspense>
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8">Loading...</div>}>
        <PlayersContent />
      </Suspense>
    </div>
  );
}
