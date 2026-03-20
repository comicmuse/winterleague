"use client";

import { useState, useEffect, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface Season {
  id: string;
  year: number;
  _count: {
    leagues: number;
    competitions: number;
  };
}

export default function SeasonsAdminPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSeasons();
  }, []);

  async function fetchSeasons() {
    try {
      const res = await fetch("/api/seasons");
      const data = await res.json();
      setSeasons(data);
    } catch (err) {
      console.error("Failed to fetch seasons:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.year) {
      setError("Year is required");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: parseInt(formData.year),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create season");
      }

      // Reset form and refetch
      setFormData({ year: (new Date().getFullYear() + 1).toString() });
      setShowForm(false);
      await fetchSeasons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <Navbar />
      </Suspense>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Season Management</h1>
          <p className="text-gray-500 mt-1">
            Create and manage seasons. Each season can have multiple leagues.
          </p>
        </div>

        {/* Create Season Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            + Create Season
          </button>
        )}

        {/* Create Season Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Create New Season
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <input
                  type="number"
                  required
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ year: e.target.value })
                  }
                  min="2020"
                  max="2100"
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
                  {submitting ? "Creating..." : "Create Season"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Seasons List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Seasons</h2>
          </div>

          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Loading seasons...
            </div>
          ) : seasons.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No seasons yet. Create one to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {seasons.map((season) => (
                <div
                  key={season.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {season.year} Season
                      </h3>
                      <div className="flex gap-4 mt-2">
                        <span className="text-sm text-gray-600">
                          {season._count.leagues} league
                          {season._count.leagues !== 1 ? "s" : ""}
                        </span>
                        <span className="text-sm text-gray-600">
                          {season._count.competitions} competition
                          {season._count.competitions !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/admin/leagues?seasonId=${season.id}`}
                      className="ml-4 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors"
                    >
                      Manage Leagues
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
