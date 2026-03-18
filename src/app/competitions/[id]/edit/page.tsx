"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { format } from "date-fns";

interface EntryRow {
  id: string;
  playerName: string;
  score: string;
  place?: number;
}

interface Competition {
  id: string;
  name: string | null;
  date: string;
  topPlaces: number;
  results: {
    id: string;
    player: { name: string };
    score: number;
    place: number;
  }[];
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function EditCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [topPlaces, setTopPlaces] = useState(5);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [competitionId, setCompetitionId] = useState("");

  useEffect(() => {
    async function fetchCompetition() {
      try {
        const resolvedParams = await params;
        setCompetitionId(resolvedParams.id);

        const res = await fetch(`/api/competitions/${resolvedParams.id}`);
        if (!res.ok) throw new Error("Competition not found");

        const comp: Competition = await res.json();
        setCompetition(comp);
        setName(comp.name || "");
        setDate(comp.date.split("T")[0]);
        setTopPlaces(comp.topPlaces);

        // Convert results to entry format
        const entryRows = comp.results.map((result) => ({
          id: result.id,
          playerName: result.player.name,
          score: result.score.toString(),
          place: result.place,
        }));
        setEntries(entryRows);
      } catch (err) {
        setError("Failed to load competition");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchCompetition();
  }, [params]);

  function addRow() {
    setEntries([...entries, { id: "", playerName: "", score: "" }]);
  }

  function removeRow(index: number) {
    setEntries(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, field: keyof EntryRow, value: string) {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  }

  // Live preview of places based on current scores
  function getPreviewPlaces(): (number | null)[] {
    const scores = entries.map((e) => parseFloat(e.score));
    const validScores = scores.map((s) => (isNaN(s) ? null : s));

    const result: (number | null)[] = new Array(entries.length).fill(null);
    const validIndices = entries
      .map((_, i) => i)
      .filter((i) => validScores[i] !== null);

    if (validIndices.length === 0) return result;

    // Sort valid indices by score
    const sorted = [...validIndices].sort(
      (a, b) => validScores[a]! - validScores[b]!
    );

    let place = 1;
    for (let i = 0; i < sorted.length; i++) {
      const idx = sorted[i];
      if (i > 0 && validScores[idx] === validScores[sorted[i - 1]]) {
        result[idx] = result[sorted[i - 1]];
      } else {
        result[idx] = place;
      }
      place = i + 2;
    }

    return result;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validEntries = entries.filter(
      (e) => e.playerName.trim() && e.score.trim()
    );

    if (!date) {
      setError("Please select a date.");
      return;
    }
    if (validEntries.length === 0) {
      setError("Please enter at least one player result.");
      return;
    }

    // Check for duplicate player names
    const names = validEntries.map((e) => e.playerName.trim().toLowerCase());
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      setError("Duplicate player names found. Each player can only appear once.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/competitions/${competitionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          date,
          topPlaces,
          entries: validEntries.map((e) => ({
            playerName: e.playerName.trim(),
            score: parseFloat(e.score),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update competition");
      }

      router.push(`/competitions/${competitionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSaving(false);
    }
  }

  const previewPlaces = getPreviewPlaces();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<div>Loading...</div>}>
          <Navbar />
        </Suspense>
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">Loading...</div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<div>Loading...</div>}>
          <Navbar />
        </Suspense>
        <div className="max-w-3xl mx-auto px-4 py-8 text-center text-red-600">
          Competition not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <Navbar />
      </Suspense>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/competitions/${competitionId}`}
            className="text-green-700 hover:underline text-sm"
          >
            ← Back to competition
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            Edit Competition Results
          </h1>
          <p className="text-gray-500 mt-1">
            Originally held on {format(new Date(competition.date), "d MMMM yyyy")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Competition details */}
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Competition Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Competition Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. January Monthly Medal"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to display competition by date only
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Scoring Places
                </label>
                <select
                  value={topPlaces}
                  onChange={(e) => setTopPlaces(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      Top {n} places ({n} pts → 1 pt)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {ordinal(1)} = {topPlaces} pts, {ordinal(2)} = {topPlaces - 1}{" "}
                  pts, …, {ordinal(topPlaces)} = 1 pt
                </p>
              </div>
            </div>
          </div>

          {/* Player results */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Player Results
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Edit player scores. Places are automatically calculated from scores
              (lowest score = best place). Players with the same score share a
              place.
            </p>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-1">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Player Name</div>
                <div className="col-span-3">Score</div>
                <div className="col-span-2">Place</div>
                <div className="col-span-1"></div>
              </div>

              {entries.map((entry, idx) => {
                const place = previewPlaces[idx];
                return (
                  <div
                    key={entry.id || idx}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-1 text-sm text-gray-400 text-center">
                      {idx + 1}
                    </div>
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={entry.playerName}
                        onChange={(e) =>
                          updateEntry(idx, "playerName", e.target.value)
                        }
                        placeholder="Player name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.1"
                        value={entry.score}
                        onChange={(e) =>
                          updateEntry(idx, "score", e.target.value)
                        }
                        placeholder="Score"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div className="col-span-2 text-center">
                      {place !== null ? (
                        <span
                          className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                            place === 1
                              ? "bg-yellow-100 text-yellow-800"
                              : place === 2
                              ? "bg-gray-100 text-gray-700"
                              : place === 3
                              ? "bg-orange-100 text-orange-700"
                              : place <= topPlaces
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-50 text-gray-400"
                          }`}
                        >
                          {ordinal(place)}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">–</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      {entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          aria-label="Remove row"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 hover:border-green-400 text-gray-500 hover:text-green-600 rounded-lg text-sm font-medium transition-colors"
            >
              + Add player
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Link
              href={`/competitions/${competitionId}`}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? "Saving…" : "Update Results"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}