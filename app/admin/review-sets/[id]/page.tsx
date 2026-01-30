"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Link as LinkIcon, Copy, ExternalLink, Trash2, BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageAsset {
  id: string;
  url: string | null;
  filePath: string | null;
  title: string | null;
  order: number;
}

interface ReviewLink {
  id: string;
  token: string;
  adminToken?: string;
  createdAt: string;
  expiresAt: string | null;
}

interface ReviewSet {
  id: string;
  title: string;
  images: ImageAsset[];
  links: ReviewLink[];
}

interface Stats {
  totalImages: number;
  totalLinks: number;
  totalRatings: number;
  likes: number;
  dislikes: number;
  uniqueClients: number;
  imagesByLikes: { zero: number; one: number; twoPlus: number };
  linksStats: Array<{ id: string; token: string; ratingsCount: number }>;
}

export default function ReviewSetPage() {
  const params = useParams();
  const router = useRouter();
  const [reviewSet, setReviewSet] = useState<ReviewSet | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [deletingLink, setDeletingLink] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [showStats, setShowStats] = useState(false);

  function loadData() {
    fetch(`/api/admin/review-sets/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setReviewSet({
            ...data,
            images: Array.isArray(data.images) ? data.images : [],
            links: Array.isArray(data.links) ? data.links : [],
          });
        } else {
          setReviewSet(null);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading review set:", error);
        setReviewSet(null);
        setLoading(false);
      });

    fetch(`/api/admin/review-sets/${params.id}/stats`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setStats(data);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function addImage() {
    if (!newImageUrl.trim()) return;

    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newImageUrl }),
      });

      if (res.ok) {
        loadData();
        setNewImageUrl("");
      } else {
        alert("Ошибка при добавлении изображения");
      }
    } catch (error) {
      alert("Ошибка при добавлении изображения");
    }
  }

  async function deleteImage(imageId: string) {
    if (!confirm("Удалить это изображение?")) return;

    setDeletingImage(imageId);
    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}/images/${imageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      } else {
        alert("Ошибка при удалении изображения");
      }
    } catch (error) {
      alert("Ошибка при удалении изображения");
    } finally {
      setDeletingImage(null);
    }
  }

  async function deleteLink(linkId: string) {
    if (!confirm("Удалить эту ссылку?")) return;

    setDeletingLink(linkId);
    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}/links/${linkId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      } else {
        alert("Ошибка при удалении ссылки");
      }
    } catch (error) {
      alert("Ошибка при удалении ссылки");
    } finally {
      setDeletingLink(null);
    }
  }

  async function deleteProject() {
    if (!confirm("Удалить проект? Это действие нельзя отменить!")) return;

    setDeletingProject(true);
    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка при удалении проекта");
      }
    } catch (error) {
      alert("Ошибка при удалении проекта");
    } finally {
      setDeletingProject(false);
    }
  }

  async function generateLink() {
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}/links`, {
        method: "POST",
      });

      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка при создании ссылки");
      }
    } catch (error) {
      alert("Ошибка при создании ссылки");
    } finally {
      setGeneratingLink(false);
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/r/${token}`;
    navigator.clipboard.writeText(url);
    alert("Ссылка скопирована!");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div>Загрузка...</div>
      </div>
    );
  }

  if (!reviewSet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div>Проект не найден</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl p-8">
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="mb-4 text-white/60 hover:text-white"
          >
            ← Админ
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">{reviewSet.title}</h1>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowStats(!showStats)}
                variant="ghost"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Статистика
              </Button>
              <Button
                onClick={deleteProject}
                disabled={deletingProject}
                variant="ghost"
                className="text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingProject ? "Удаление..." : "Удалить проект"}
              </Button>
            </div>
          </div>
        </div>

        {/* Статистика */}
        {showStats && stats && (
          <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Статистика</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStats(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Изображений</div>
                <div className="mt-1 text-2xl font-bold text-white">{stats.totalImages}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Ссылок</div>
                <div className="mt-1 text-2xl font-bold text-white">{stats.totalLinks}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Оценок</div>
                <div className="mt-1 text-2xl font-bold text-white">{stats.totalRatings}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Клиентов</div>
                <div className="mt-1 text-2xl font-bold text-white">{stats.uniqueClients}</div>
              </div>
            </div>
            {stats.totalRatings > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">0 лайков</div>
                  <div className="mt-1 text-xl font-bold text-white">{stats.imagesByLikes.zero}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">1 лайк</div>
                  <div className="mt-1 text-xl font-bold text-white">{stats.imagesByLikes.one}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">2+ лайка</div>
                  <div className="mt-1 text-xl font-bold text-white">{stats.imagesByLikes.twoPlus}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Images Section */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Изображения ({reviewSet.images.length})</h2>
            </div>

            <div className="mb-4 flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="URL изображения (опционально)"
                className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                onKeyPress={(e) => e.key === "Enter" && addImage()}
              />
              <Button onClick={addImage} disabled={!newImageUrl.trim()} className="bg-white/10 text-white hover:bg-white/20">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {!reviewSet.images || reviewSet.images.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-white/50">
                Нет изображений.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {reviewSet.images.map((img) => {
                  const src = img.filePath || img.url || "";
                  return (
                    <div key={img.id} className="group relative overflow-hidden rounded-lg">
                      {src ? (
                        <img
                          src={src}
                          alt={img.title || "Reference"}
                          className="h-32 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-32 items-center justify-center bg-white/5 text-white/50">Нет URL</div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteImage(img.id)}
                          disabled={deletingImage === img.id}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Links Section */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Ссылки для оценки ({reviewSet.links.length})</h2>
              <Button 
                onClick={generateLink} 
                disabled={generatingLink || !reviewSet.images || reviewSet.images.length === 0}
                className="bg-white/10 text-white hover:bg-white/20"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {generatingLink ? "Создание..." : "Создать"}
              </Button>
            </div>

            {!reviewSet.links || reviewSet.links.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-white/50">
                Нет ссылок. Создайте ссылку для клиентов.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewSet.links.map((link) => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const clientUrl = `${origin}/r/${link.token}`;
                  const resultsUrl = link.adminToken ? `${origin}/admin/results/${link.adminToken}` : null;
                  const linkStats = stats?.linksStats?.find(s => s.id === link.id);
                  return (
                    <div
                      key={link.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-white/80 break-all">{clientUrl}</div>
                        <div className="mt-1 text-xs text-white/50">
                          Создано: {new Date(link.createdAt).toLocaleString()}
                          {linkStats && ` • ${linkStats.ratingsCount} оценок`}
                        </div>
                        {resultsUrl && (
                          <a
                            href={resultsUrl}
                            className="mt-2 inline-block text-sm text-emerald-400 hover:text-emerald-300"
                          >
                            Результаты →
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLink(link.token)}
                          className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <a href={`/r/${link.token}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                        {resultsUrl && (
                          <a href={resultsUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
                              Результаты
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLink(link.id)}
                          disabled={deletingLink === link.id}
                          className="text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
