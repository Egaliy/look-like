"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NewReviewSetPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/review-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/admin/review-sets/${data.id}`);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error creating review set");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-black">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl p-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-white/60 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="mb-8 text-3xl font-bold text-white">
          Create New Review Set
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-white/10 bg-white/5 p-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-white/80"
            >
              Title *
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="e.g., Finance landing references"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-white/80"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="bg-white/10 text-white hover:bg-white/20">
              {loading ? "Creating..." : "Create Review Set"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              className="bg-white/5 text-white/80 hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
