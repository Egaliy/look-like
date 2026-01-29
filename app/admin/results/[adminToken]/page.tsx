"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Rating {
  id: string;
  imageId: string;
  decision: "like" | "dislike";
  clientId: string;
  timestamp: string;
}

interface ImageWithRatings {
  id: string;
  url: string | null;
  filePath: string | null;
  ratings: Rating[];
}

export default function ResultsPage() {
  const params = useParams();
  const [images, setImages] = useState<ImageWithRatings[]>([]);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading results:", error);
      setLoading(false);
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

  // Группируем изображения по количеству лайков
  const groupedImages = {
    zero: images.filter((img) => getLikeCount(img) === 0),
    one: images.filter((img) => getLikeCount(img) === 1),
    two: images.filter((img) => getLikeCount(img) === 2),
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div>Загрузка результатов...</div>
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
        <h1 className="mb-8 text-3xl font-bold text-white">Результаты оценки</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 0 лайков */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              0 лайков ({groupedImages.zero.length})
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

          {/* 1 лайк */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              1 лайк ({groupedImages.one.length})
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

          {/* 2 лайка */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              2 лайка ({groupedImages.two.length})
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
