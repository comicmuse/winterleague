"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface League {
  id: string;
  name: string;
}

export default function LeagueFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>("");

  useEffect(() => {
    // Fetch leagues
    fetch("/api/leagues")
      .then((res) => res.json())
      .then((data) => {
        setLeagues(data);
        const leagueParam = searchParams.get("leagueId");
        if (leagueParam) {
          setSelectedLeague(leagueParam);
        }
      })
      .catch((err) => console.error("Failed to fetch leagues:", err));
  }, []);

  const handleLeagueChange = (leagueId: string) => {
    setSelectedLeague(leagueId);
    const params = new URLSearchParams(searchParams.toString());
    if (leagueId) {
      params.set("leagueId", leagueId);
    } else {
      params.delete("leagueId");
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Filter by League
      </label>
      <select
        value={selectedLeague}
        onChange={(e) => handleLeagueChange(e.target.value)}
        className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
      >
        <option value="">All Leagues</option>
        {leagues.map((league) => (
          <option key={league.id} value={league.id}>
            {league.name}
          </option>
        ))}
      </select>
    </div>
  );
}
