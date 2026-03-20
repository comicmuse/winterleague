"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface League {
  id: string;
  name: string;
  description: string | null;
  season: {
    id: string;
    year: number;
  };
  _count: {
    competitions: number;
  };
}

interface Season {
  id: string;
  year: number;
}

function LeaguesContent() {
  const searchParams = useSearchParams();
  const preselectedSeasonId = searchParams.get("seasonId");

  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>(preselectedSeasonId || "");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    seasonId: preselectedSeasonId || "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSeasons = useCallback(async () => {
    try {
      const res = await fetch("/api/seasons");
      const data = await res.json();
      setSeasons(data);
      if (data.length > 0) {
        const defaultSeason = preselectedSeasonId || data[0].id;
        setSelectedSeason(defaultSeason);
        setFormData((prev) => ({ ...prev, seasonId: defaultSeason }));
      }
    } catch (err) {
      console.error("Failed to fetch seasons:", err);
    }
  }, [preselectedSeasonId]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  useEffect(() => {
    if (selectedSeason) {
      fetchLeagues(selectedSeason);
    }
  }, [selectedSeason]);

  async function fetchLeagues(seasonId: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/leagues?seasonId=${seasonId}`);
      const data = await res.json();
      setLeagues(data);
    } catch (err) {
      console.error("Failed to fetch leagues:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("League name is required");
      return;
    }

    if (!formData.seasonId) {
      setError("Season is required");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          seasonId: formData.seasonId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create league");
      }

      // Reset form and refetch
      setFormData({ name: "", description: "", seasonId: formData.seasonId });
      setShowForm(false);
      await fetchLeagues(formData.seasonId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const currentSeason = seasons.find(s => s.id === selectedSeason);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin/seasons"
          className="text-green-700 hover:underline text-sm mb-2 inline-block"
        >
          ← Back to seasons
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">League Management</h1>
        <p className="text-gray-500 mt-1">
          Create and manage leagues within a season
        </p>
      </div>

      {/* Season Selector */}
      {seasons.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Season
          </label>
          <select
            value={selectedSeason}
            onChange={(e) => {
              setSelectedSeason(e.target.value);
              setFormData((prev) => ({ ...prev, seasonId: e.target.value }));
            }}
            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.year} Season
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Create League Button */}
      {selectedSeason && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          + Create League
        </button>
      )}

      {/* Create League Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Create New League in {currentSeason?.year} Season
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                League Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Seniors League"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="e.g. For players aged 55+"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                  setFormData((prev) => ({ ...prev, name: "", description: "" }));
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
              >
                {submitting ? "Creating..." : "Create League"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leagues List */}
      {selectedSeason && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">
              Leagues in {currentSeason?.year}
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Loading leagues...
            </div>
          ) : leagues.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No leagues yet. Create one to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leagues.map((league) => (
                <div
                  key={league.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {league.name}
                    </h3>
                    {league.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {league.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      {league._count.competitions} competition
                      {league._count.competitions !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function LeaguesAdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <Navbar />
      </Suspense>
      <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>}>
        <LeaguesContent />
      </Suspense>
    </div>
  );
}
