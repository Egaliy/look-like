"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewSet {
  id: string;
  title: string;
  createdAt: string;
  _count: {
    images: number;
    links: number;
  };
}

export default function AdminDashboard() {
  const [reviewSets, setReviewSets] = useState<ReviewSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/review-sets")
      .then((res) => res.json())
      .then((data) => {
        // Убеждаемся, что data - это массив
        if (Array.isArray(data)) {
          setReviewSets(data);
        } else {
          // Если пришла ошибка или не массив, устанавливаем пустой массив
          setReviewSets([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading review sets:", error);
        setReviewSets([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen w-full bg-black">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="mt-2 text-white/60">
              Manage review sets and view results
            </p>
          </div>
          <Link href="/admin/review-sets/new">
            <Button className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20">
              <Plus className="h-4 w-4" />
              New Review Set
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-white/60">Loading...</div>
        ) : reviewSets.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-white/80">No review sets yet.</p>
            <Link href="/admin/review-sets/new">
              <Button className="mt-4 bg-white/10 text-white hover:bg-white/20">
                Create your first review set
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviewSets.map((set) => (
              <Link
                key={set.id}
                href={`/admin/review-sets/${set.id}`}
                className="rounded-lg border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:shadow-lg"
              >
                <h3 className="text-lg font-semibold text-white">
                  {set.title}
                </h3>
                <div className="mt-4 flex items-center gap-4 text-sm text-white/60">
                  <span>{set._count.images} images</span>
                  <span>{set._count.links} links</span>
                </div>
                <div className="mt-2 text-xs text-white/50">
                  Created: {new Date(set.createdAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
