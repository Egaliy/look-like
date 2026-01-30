"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Trash2, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Rating {
  id: string;
  imageId: string;
  decision: "like" | "dislike";
  clientId: string;
  sessionId?: string | null;
  timestamp: string;
}

interface ImageWithRatings {
  id: string;
  url: string | null;
  filePath: string | null;
  ratings: Rating[];
}

interface Session {
  clientId: string;
  firstRating: string;
  lastRating: string;
  totalRatings: number;
  likes: number;
  dislikes: number;
}

export default function ResultsPage() {
  const params = useParams();
  const [images, setImages] = useState<ImageWithRatings[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
    // Обновляем результаты каждые 2 секунды
    const interval = setInterval(loadResults, 2000);
    return () => clearInterval(interval);
  }, [params.adminToken]);

  async function loadResults() {
    try {
      const res = await fetch(`/api/admin/results/${params.adminToken}`);
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
        setSessions(data.sessions || []);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading results:", error);
      setLoading(false);
    }
  }

  async function deleteSession(clientId: string) {
    if (!confirm(`Delete all ratings from this session? This action cannot be undone.`)) {
      return;
    }

    setDeletingSession(clientId);
    try {
      const res = await fetch(`/api/admin/results/${params.adminToken}/sessions/${clientId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadResults();
      } else {
        const data = await res.json();
        alert(data.error || "Error deleting session");
      }
    } catch (error) {
      alert("Error deleting session");
    } finally {
      setDeletingSession(null);
    }
  }

  function getImageUrl(image: ImageWithRatings): string {
    return image.filePath || image.url || "";
  }

  function getLikeCount(image: ImageWithRatings): number {
    return image.ratings.filter((r) => r.decision === "like").length;
  }

  function getDislikeCount(image: ImageWithRatings): number {
    return image.ratings.filter((r) => r.decision === "dislike").length;
  }

  function formatClientName(clientId: string): string {
    // Извлекаем время из clientId (формат: client_TIMESTAMP_random)
    const parts = clientId.split('_');
    if (parts.length >= 2 && parts[1]) {
      const timestamp = parseInt(parts[1]);
      if (!isNaN(timestamp)) {
        const date = new Date(timestamp);
        return `User ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      }
    }
    return `User ${clientId.substring(0, 8)}...`;
  }

  // Group images by like count
  const groupedImages = {
    zero: images.filter((img) => getLikeCount(img) === 0),
    one: images.filter((img) => getLikeCount(img) === 1),
    two: images.filter((img) => getLikeCount(img) === 2),
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div>Loading results...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl p-8">
        <h1 className="mb-8 text-3xl font-bold text-white">Review Results</h1>

        {/* Sessions List */}
        {sessions.length > 0 && (
          <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Sessions ({sessions.length})
            </h2>
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.clientId}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex-1">
                    <div className="font-medium text-white">{formatClientName(session.clientId)}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Started: {new Date(session.firstRating).toLocaleString()}
                      </span>
                      <span>Last: {new Date(session.lastRating).toLocaleString()}</span>
                      <span>{session.totalRatings} ratings</span>
                      <span className="text-green-400">{session.likes} likes</span>
                      <span className="text-red-400">{session.dislikes} dislikes</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => deleteSession(session.clientId)}
                    disabled={deletingSession === session.clientId}
                    variant="ghost"
                    size="sm"
                    className="text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingSession === session.clientId ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 0 likes */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              0 likes ({groupedImages.zero.length})
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {groupedImages.zero.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg">
                  <img
                    src={getImageUrl(img)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-xs text-white text-center">
                    {getDislikeCount(img)} 👎
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 1 like */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              1 like ({groupedImages.one.length})
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {groupedImages.one.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg">
                  <img
                    src={getImageUrl(img)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-xs text-white text-center">
                    1 ❤️ {getDislikeCount(img) > 0 && `${getDislikeCount(img)} 👎`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2 likes */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              2 likes ({groupedImages.two.length})
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {groupedImages.two.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg">
                  <img
                    src={getImageUrl(img)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-xs text-white text-center">
                    2 ❤️
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
