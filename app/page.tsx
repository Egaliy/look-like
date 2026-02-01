"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeedContent } from "@/components/FeedContent";

/**
 * Главная страница: контент стандартного (нижнего) проекта.
 * Данные приходят отдельно из /api/default-feed — без редиректа.
 */
export default function Home() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [refs, setRefs] = useState<{ id: string; title: string; subtitle?: string; url: string }[]>([]);
  const [token, setToken] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadDefaultFeed = () => {
    setStatus("loading");
    setErrorMessage("");
    fetch("/api/default-feed")
      .then((res) => {
        if (!res.ok) {
          const err =
            res.status === 404
              ? "Нет стандартной папки"
              : res.status === 500
                ? "Ошибка сервера. Попробуйте ещё раз."
                : "Не удалось загрузить проект";
          setErrorMessage(err);
          setStatus("error");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const list = Array.isArray(data.images) ? data.images : [];
        setRefs(
          list.map((img: any, i: number) => ({
            id: img.id,
            title: img.title || `Reference #${i + 1}`,
            subtitle: "Swipe to rate",
            url: img.filePath || img.url || "",
          }))
        );
        setToken(data.token || "");
        setStatus(list.length > 0 && data.token ? "ready" : "error");
        if (list.length === 0 || !data.token) {
          setErrorMessage("Нет стандартной папки или нет фото");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Ошибка сети. Проверьте подключение и попробуйте снова.");
      });
  };

  useEffect(() => {
    loadDefaultFeed();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-white/60">Загрузка…</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center max-w-sm">
          <p className="mb-2 text-lg font-semibold text-white">{errorMessage}</p>
          <p className="mb-4 text-sm text-white/60">
            Добавьте проект в админке и поставьте его последним в списке — он станет стандартным.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={loadDefaultFeed}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Повторить
            </button>
            <Link
              href="/admin"
              className="inline-block rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Открыть админку
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <FeedContent token={token} initialRefs={refs} />;
}
