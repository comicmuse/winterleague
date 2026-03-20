"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteCompetitionButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this competition? This cannot be undone.")) return;
    setLoading(true);
    await fetch(`/api/competitions/${id}`, { method: "DELETE" });
    router.push("/competitions");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-4 py-2 text-sm text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? "Deleting…" : "🗑 Delete"}
    </button>
  );
}
