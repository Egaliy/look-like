"use client";

import { useState, useEffect } from "react";

// Pinterest Pin IDs для получения изображений (можно заменить на реальные)
const PINTEREST_IMAGES = [
  "https://i.pinimg.com/564x/1a/2b/3c/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6.jpg",
  "https://i.pinimg.com/564x/2b/3c/4d/2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7.jpg",
  "https://i.pinimg.com/564x/3c/4d/5e/3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8.jpg",
  "https://i.pinimg.com/564x/4d/5e/6f/4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9.jpg",
  "https://i.pinimg.com/564x/5e/6f/7a/5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0.jpg",
];

// Генерируем рандомные изображения с Unsplash (бесплатный API)
function getRandomImage(index: number): string {
  const categories = ["interior", "design", "architecture", "fashion", "art", "nature", "food", "travel"];
  const category = categories[index % categories.length];
  return `https://source.unsplash.com/800x600/?${category}&sig=${index}`;
}

export default function Home() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    // Генерируем 12 рандомных изображений
    const randomImages = Array.from({ length: 12 }, (_, i) => getRandomImage(i));
    setImages(randomImages);
  }, []);

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white">Look Like</h1>
          <p className="text-white/60">Swipe-based Reference Review</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="/admin"
              className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
            >
              Admin Panel
            </a>
          </div>
        </div>

        {/* Галерея рандомных изображений */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
            >
              <img
                src={img}
                alt={`Inspiration ${idx + 1}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
