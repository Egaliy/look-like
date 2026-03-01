"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeedContent } from "@/components/FeedContent";
import { Loader } from "@/components/Loader";

/**
 * Главная страница: контент стандартного (нижнего) проекта.
 * Данные приходят отдельно из /api/default-feed — без редиректа.
 */
export default function Home() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [refs, setRefs] = useState<{ id: string; title: string; subtitle?: string; url: string }[]>([]);
  const [token, setToken] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadDefaultFeed = async () => {
    const startTime = Date.now();
    setStatus("loading");
    setErrorMessage("");
    
    try {
      // Запускаем загрузку и таймер параллельно
      const fetchPromise = fetch("/api/default-feed");
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 1000));
      
      // Ждем минимум 1 секунду, но не больше времени загрузки
      await Promise.all([fetchPromise, timeoutPromise]);
      
      const res = await fetchPromise;

      if (!res.ok) {
        const err =
          res.status === 404
            ? "No default project"
            : res.status === 500
              ? "Server error. Please try again."
              : "Failed to load project";
        setErrorMessage(err);
        setStatus("error");
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data.images) ? data.images : [];
      if (list.length > 0 && data.token) {
        setRefs(
          list.map((img: any, i: number) => ({
            id: img.id,
            title: img.title || `Reference #${i + 1}`,
            subtitle: "Swipe to rate",
            url: img.filePath || img.url || "",
          }))
        );
        setToken(data.token || "");
        setStatus("ready");
        return;
      }
      // Нет стандартной папки или нет фото — подставляем тестовые из imgs
      const testRes = await fetch("/api/test-images");
      const testData = testRes.ok ? await testRes.json() : null;
      const testList = Array.isArray(testData?.images) ? testData.images : [];
      if (testList.length > 0) {
        setRefs(
          testList.map((img: any) => ({
            id: img.id,
            title: img.title || "Reference",
            subtitle: "Swipe to rate",
            url: img.url || "",
          }))
        );
        setToken("");
        setStatus("ready");
      } else {
        setErrorMessage("No default project or no photos");
        setStatus("error");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Check your connection and try again.");
    }
  };

  useEffect(() => {
    loadDefaultFeed();
  }, []);

  if (status === "loading") {
    return <Loader />;
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center max-w-sm">
          <p className="mb-2 text-lg font-semibold text-white">{errorMessage}</p>
          <p className="mb-4 text-sm text-white/60">
            Add a project in the admin and put it last in the list to make it the default. Or add an imgs folder with test photos.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={loadDefaultFeed}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Retry
            </button>
            <Link
              href="/admin"
              className="inline-block rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Open admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <FeedContent token={token} initialRefs={refs} />;
}
