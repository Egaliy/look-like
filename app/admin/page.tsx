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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Manage review sets and view results
            </p>
          </div>
          <Link href="/admin/review-sets/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Review Set
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-600">Loading...</div>
        ) : reviewSets.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-600">No review sets yet.</p>
            <Link href="/admin/review-sets/new">
              <Button className="mt-4">Create your first review set</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviewSets.map((set) => (
              <Link
                key={set.id}
                href={`/admin/review-sets/${set.id}`}
                className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {set.title}
                </h3>
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                  <span>{set._count.images} images</span>
                  <span>{set._count.links} links</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
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
