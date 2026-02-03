"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Copy, Trash2, X, Upload, ChevronLeft, ChevronRight, Download, BarChart3, Settings, Check } from "lucide-react";
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
  icon: string | null;
  maxImagesToRate: number | null;
  images: ImageAsset[];
  links: ReviewLink[];
}

interface StatsImage {
  id: string;
  filePath: string | null;
  url: string | null;
  title: string | null;
}

interface Stats {
  totalImages: number;
  totalLinks: number;
  totalRatings: number;
  likes: number;
  dislikes: number;
  uniqueClients: number;
  users?: Array<{
    clientId: string;
    userName: string | null;
    totalRatings: number;
    likes: number;
    dislikes: number;
    firstRating: string | null;
    lastRating: string | null;
  }>;
  imagesByLikes: { zero: number; one: number; twoPlus: number };
  imagesByLikesList?: {
    zero: StatsImage[];
    one: StatsImage[];
    twoPlus: StatsImage[];
  };
  linksStats: Array<{ id: string; token: string; ratingsCount: number }>;
}

type Tab = "stats" | "settings";

export default function ReviewSetPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = tabParam === "settings" ? "settings" : "stats";
  const [reviewSet, setReviewSet] = useState<ReviewSet | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    uploaded: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gallery, setGallery] = useState<{ images: StatsImage[]; index: number } | null>(null);
  const [savingLimit, setSavingLimit] = useState(false);
  const [savingIcon, setSavingIcon] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const linkCreatedRef = useRef(false);

  function loadData() {
    fetch(`/api/admin/review-sets/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setReviewSet({
            ...data,
            icon: data.icon ?? null,
            maxImagesToRate: data.maxImagesToRate ?? null,
            images: Array.isArray(data.images) ? data.images : [],
            links: Array.isArray(data.links) ? data.links : [],
          });
          // Статистика по внутреннему id (дочерние API принимают только id)
          fetch(`/api/admin/review-sets/${data.id}/stats`)
            .then((r) => r.json())
            .then((statsData) => {
              if (statsData && !statsData.error) setStats(statsData);
            })
            .catch(() => {});
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
  }

  useEffect(() => {
    loadData();
    linkCreatedRef.current = false;
  }, [params.id]);

  useEffect(() => {
    if (gallery) galleryRef.current?.focus();
  }, [gallery]);

  // Автоматически создаем ссылку, если её нет и есть изображения
  useEffect(() => {
    if (
      reviewSet && 
      reviewSet.images && 
      reviewSet.images.length > 0 && 
      (!reviewSet.links || reviewSet.links.length === 0) && 
      !generatingLink &&
      !linkCreatedRef.current
    ) {
      linkCreatedRef.current = true;
      generateLink();
    }
  }, [reviewSet, generatingLink]);

  async function addImage() {
    if (!newImageUrl.trim() || !reviewSet) return;

    try {
      const res = await fetch(`/api/admin/review-sets/${reviewSet.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newImageUrl }),
      });

      if (res.ok) {
        loadData();
        setNewImageUrl("");
      } else {
        alert("Error adding image");
      }
    } catch (error) {
      alert("Error adding image");
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0 || !reviewSet) return;

    const fileArray = Array.from(files);
    const totalFiles = fileArray.length;
    let uploaded = 0;
    let failed = 0;
    const errors: string[] = [];

    setUploading(true);
    setUploadProgress({
      total: totalFiles,
      uploaded: 0,
      failed: 0,
      errors: [],
    });

    try {
      for (const file of fileArray) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("reviewSetId", reviewSet.id);

          const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
          const data = await res.json();
          
          if (data.success) {
            if (data.files && Array.isArray(data.files)) {
              // ZIP файл - добавляем все файлы из архива
              for (const filePath of data.files) {
                await addImageToDB(filePath);
              }
              uploaded += data.files.length;
            } else if (data.filePath) {
              // Одиночный файл
              await addImageToDB(data.filePath);
              uploaded++;
            }
          } else {
            failed++;
            errors.push(`${file.name}: ${data.error || "Upload failed"}`);
          }
        } catch (error: any) {
          failed++;
          errors.push(`${file.name}: ${error.message || "Upload error"}`);
        }

        setUploadProgress({
          total: totalFiles,
          uploaded,
          failed,
          errors: [...errors],
        });
      }
    } catch (error) {
      console.error(error);
      errors.push("General upload error");
    } finally {
      setUploading(false);
      loadData();
      // Очищаем прогресс через 5 секунд
      setTimeout(() => {
        setUploadProgress(null);
      }, 5000);
    }
  }

  async function addImageToDB(filePath: string) {
    if (!reviewSet) return;
    try {
      const res = await fetch(`/api/admin/review-sets/${reviewSet.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });

      if (!res.ok) {
        throw new Error("Failed to add image to database");
      }
    } catch (error) {
      console.error("Error adding image to DB:", error);
      throw error;
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  }

  async function deleteImage(imageId: string) {
    if (!reviewSet || !confirm("Delete this image?")) return;

    setDeletingImage(imageId);
    try {
      const res = await fetch(`/api/admin/review-sets/${reviewSet.id}/images/${imageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      } else {
        alert("Error deleting image");
      }
    } catch (error) {
      alert("Error deleting image");
    } finally {
      setDeletingImage(null);
    }
  }

  async function deleteProject() {
    if (!reviewSet || !confirm("Delete project? This action cannot be undone!")) return;

    setDeletingProject(true);
    try {
      const res = await fetch(`/api/admin/review-sets/${reviewSet.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        const data = await res.json();
        alert(data.error || "Error deleting project");
      }
    } catch (error) {
      alert("Error deleting project");
    } finally {
      setDeletingProject(false);
    }
  }

  async function generateLink() {
    if (!reviewSet) return;
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/admin/review-sets/${reviewSet.id}/links`, {
        method: "POST",
      });

      if (res.ok) {
        linkCreatedRef.current = true;
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Error creating link");
        linkCreatedRef.current = false;
      }
    } catch (error) {
      alert("Error creating link");
      linkCreatedRef.current = false;
    } finally {
      setGeneratingLink(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div>Loading...</div>
      </div>
    );
  }

  if (!reviewSet) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center max-w-md">
          <div className="mb-2 text-lg font-semibold">Project not found</div>
          <div className="mb-4 text-sm text-white/70">
            No project with this ID in the database. It may have been deleted, the link may be outdated, or you followed a link from another environment.
          </div>
          <p className="mb-4 font-mono text-xs text-white/50 break-all">ID: {String(params.id)}</p>
          <Button
            onClick={() => router.push("/admin")}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            ← Back to projects
          </Button>
        </div>
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
            ← Admin
          </button>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <label className="flex shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/5 w-12 h-12 text-2xl cursor-pointer hover:bg-white/10 transition-colors" title="Иконка проекта (эмодзи). На Mac: Ctrl+Cmd+Space">
                  <input
                    type="text"
                    inputMode="text"
                    maxLength={20}
                    value={reviewSet.icon ?? ""}
                    onChange={(e) => setReviewSet((prev) => (prev ? { ...prev, icon: e.target.value || null } : null))}
                    onBlur={async (e) => {
                      if (!reviewSet) return;
                      const v = (e.target as HTMLInputElement).value.trim() || null;
                      setSavingIcon(true);
                      try {
                        const res = await fetch(`/api/admin/review-sets/${reviewSet.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ icon: v }),
                        });
                        if (res.ok) setReviewSet((prev) => (prev ? { ...prev, icon: v } : null));
                      } finally {
                        setSavingIcon(false);
                      }
                    }}
                    className="w-8 h-8 text-center bg-transparent border-0 outline-none text-2xl text-white placeholder:text-white/40"
                    placeholder="✨"
                    title="Эмодзи (Mac: Ctrl+Cmd+Space)"
                  />
                </label>
                <h1 className="text-3xl font-bold text-white">{reviewSet.title}</h1>
                {savingIcon && <span className="text-xs text-white/50">Saving…</span>}
              </div>
              {reviewSet.links && reviewSet.links.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-white/60">Link:</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/r/${reviewSet.links[0].token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-emerald-400 hover:text-emerald-300 underline"
                    >
                      {typeof window !== "undefined" ? `${window.location.origin}/r/${reviewSet.links[0].token}` : `/r/${reviewSet.links[0].token}`}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={linkCopied ? "Скопировано!" : "Скопировать ссылку"}
                      onClick={() => {
                        const url = typeof window !== "undefined" ? `${window.location.origin}/r/${reviewSet.links[0].token}` : `/r/${reviewSet.links[0].token}`;
                        navigator.clipboard.writeText(url);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                      className={`h-6 w-6 p-0 transition-colors ${
                        linkCopied
                          ? "text-green-400 hover:text-green-300 hover:bg-green-400/10"
                          : "text-white/60 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {linkCopied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={deleteProject}
                disabled={deletingProject}
                variant="ghost"
                className="text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingProject ? "Deleting..." : "Delete Project"}
              </Button>
            </div>
          </div>

          {/* Переключатель: Статистика | Настройки */}
          <div className="mb-6 flex gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
            <Link
              href={`/admin/review-sets/${params.id}?tab=stats`}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "stats" ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Статистика
            </Link>
            <Link
              href={`/admin/review-sets/${params.id}?tab=settings`}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "settings" ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="h-4 w-4" />
              Настройки
            </Link>
          </div>

          {tab === "settings" && (
            <>
          {/* Лимит фото на оценку */}
          <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-white" style={{ fontSize: "28px", fontWeight: 400, lineHeight: "34px" }}>Rating limit</h2>
            <p className="mb-4 text-sm text-white/60">
              How many photos to show per session. If there are more in the folder, that many random ones will be chosen.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={reviewSet.maxImagesToRate == null}
                  onChange={async (e) => {
                    const rateAll = e.target.checked;
                    setReviewSet((prev) => (prev ? { ...prev, maxImagesToRate: rateAll ? null : 40 } : null));
                    setSavingLimit(true);
                    try {
                      const res = await fetch(`/api/admin/review-sets/${reviewSet.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ maxImagesToRate: rateAll ? null : 40 }),
                      });
                      if (!res.ok) setReviewSet((prev) => (prev ? { ...prev, maxImagesToRate: reviewSet.maxImagesToRate } : null));
                    } finally {
                      setSavingLimit(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-white/30 bg-black/30 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-white">Rate all photos</span>
              </label>
              <span className="text-white/40">or</span>
              <label className="flex items-center gap-2">
                <span className="text-white/80">Limit to</span>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={reviewSet.maxImagesToRate ?? 40}
                  disabled={reviewSet.maxImagesToRate == null}
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = v === "" ? 40 : Math.max(1, Math.min(9999, parseInt(v, 10) || 40));
                    setReviewSet((prev) => (prev ? { ...prev, maxImagesToRate: reviewSet.maxImagesToRate == null ? null : n } : null));
                  }}
                  onBlur={async () => {
                    if (reviewSet.maxImagesToRate == null) return;
                    setSavingLimit(true);
                    try {
                      await fetch(`/api/admin/review-sets/${reviewSet.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ maxImagesToRate: reviewSet.maxImagesToRate }),
                      });
                    } finally {
                      setSavingLimit(false);
                    }
                  }}
                  className="h-9 w-20 rounded border border-white/20 bg-black/30 px-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-white/60">photos</span>
              </label>
              {savingLimit && <span className="text-xs text-white/50">Saving…</span>}
            </div>
            <p className="mt-2 text-xs text-white/50">
              {reviewSet.maxImagesToRate == null
                ? "Users will see all photos in the folder."
                : `Users will see up to ${reviewSet.maxImagesToRate} random photos per session.`}
            </p>
          </div>

          {/* Загруженные фото — только во вкладке Настройки */}
          <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-white/90">Uploaded photos ({reviewSet.images.length})</h2>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="URL (optional)"
                className="max-w-[180px] rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
                onKeyPress={(e) => e.key === "Enter" && addImage()}
              />
              <Button onClick={addImage} disabled={!newImageUrl.trim()} size="sm" className="h-7 bg-white/10 text-white hover:bg-white/20">
                <Plus className="h-3 w-3" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.zip"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="sm"
                className="h-7 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
              >
                <Upload className="mr-1 h-3 w-3" />
                <span className="text-xs">Files or ZIP</span>
              </Button>
            </div>

            {uploadProgress && (
              <div className="mb-3 rounded border border-white/10 bg-black/20 px-3 py-2">
                <div className="mb-1 flex items-center justify-between text-xs text-white">
                  <span>{uploadProgress.uploaded} / {uploadProgress.total}</span>
                  {uploadProgress.failed > 0 && <span className="text-red-400">{uploadProgress.failed} failed</span>}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-500/80 transition-all" style={{ width: `${(uploadProgress.uploaded / uploadProgress.total) * 100}%` }} />
                </div>
                {uploadProgress.errors.length > 0 && (
                  <div className="mt-2 space-y-0.5 text-xs text-red-400">
                    {uploadProgress.errors.map((error, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <X className="h-3 w-3 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!reviewSet.images || reviewSet.images.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
                  isDragging ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-white/50">{isDragging ? "Drop files here" : "No photos. Drag and drop here or upload above."}</span>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`grid grid-cols-4 gap-2 rounded-lg p-1 sm:grid-cols-5 md:grid-cols-6 ${
                  isDragging ? "bg-emerald-400/10 border-2 border-dashed border-emerald-400/50" : ""
                }`}
              >
                {reviewSet.images.map((img) => {
                  const src = img.filePath || img.url || "";
                  return (
                    <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg">
                      {src ? (
                        <img src={src} alt={img.title || "Reference"} className="h-full w-full object-cover rounded-lg" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-white/5 text-xs text-white/50">No URL</div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/60">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteImage(img.id)}
                          disabled={deletingImage === img.id}
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-400/10 hover:text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {isDragging && (
                  <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-emerald-400/50 bg-emerald-400/10 text-xs text-emerald-400">
                    +
                  </div>
                )}
              </div>
            )}
          </div>
            </>
          )}

        </div>

        {tab === "stats" && stats && (
        <>
        {/* 1. Статистика */}
            <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
              <h2 className="mb-4 text-white" style={{ fontSize: "28px", fontWeight: 400, lineHeight: "34px" }}>Statistics</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Completed</div>
                  <div className="mt-1 text-2xl font-bold text-white">{stats.uniqueClients}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Likes</div>
                  <div className="mt-1 text-2xl font-bold text-green-400">{stats.likes}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Dislikes</div>
                  <div className="mt-1 text-2xl font-bold text-red-400">{stats.dislikes}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Total ratings</div>
                  <div className="mt-1 text-2xl font-bold text-white">{stats.totalRatings}</div>
                </div>
              </div>
              {/* Список пользователей */}
              {stats.users && stats.users.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-medium text-white/80">Users</h3>
                  <div className="space-y-2">
                    {stats.users.map((user) => (
                      <div
                        key={user.clientId}
                        className="rounded-lg border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-white">
                              {user.userName || `User ${user.clientId.slice(0, 8)}`}
                            </div>
                            <div className="mt-1 text-xs text-white/50">
                              {user.likes} likes · {user.dislikes} dislikes · {user.totalRatings} total
                            </div>
                          </div>
                          <div className="text-xs text-white/40">
                            {user.firstRating && new Date(user.firstRating).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Оценки по фото: фото по группам; при 1 проходе — отлайканные, при 2+ — 2+ лайка; остальное в свёртках */}
              <div className="mt-4">
                <h3 className="mb-3 text-sm font-medium text-white/80">Ratings by photo</h3>
                {stats.imagesByLikesList && reviewSet ? (() => {
                  const list = stats.imagesByLikesList;
                  const onePass = stats.uniqueClients === 1;
                  // При 1 проходе сначала показываем «1 лайк» (что выбрал пользователь); при 2+ — «2+ лайка»
                  const mainBucket = onePass ? "one" : "twoPlus";
                  const mainLabel = onePass ? "1 like" : "2+ likes";
                  const mainImages = list[mainBucket];
                  const hiddenBuckets = onePass
                    ? [
                        { key: "zero" as const, label: "0 likes", images: list.zero },
                        { key: "twoPlus" as const, label: "2+ likes", images: list.twoPlus },
                      ]
                    : [
                        { key: "zero" as const, label: "0 likes", images: list.zero },
                        { key: "one" as const, label: "1 like", images: list.one },
                      ];

                  function imgSrc(img: StatsImage) {
                    return img.filePath || img.url || "";
                  }

                  function BucketBlock({
                    title,
                    images,
                    bucket,
                                  }: {
                    title: string;
                    images: StatsImage[];
                    bucket: "zero" | "one" | "twoPlus";
                  }) {
                    if (images.length === 0) return null;
                    return (
                      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-medium text-white/80">{title}</span>
                          <Button
                            size="sm"
                            className="h-7 gap-1 bg-white/10 text-white hover:bg-white/20"
                            onClick={() => {
                              const url = `/api/admin/review-sets/${reviewSet!.id}/download-archive?bucket=${bucket}`;
                              window.open(url, "_blank");
                            }}
                          >
                            <Download className="h-3 w-3" />
                            <span className="text-xs">Download archive</span>
                          </Button>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {images.map((img, idx) => {
                            const src = imgSrc(img);
                            return (
                              <button
                                key={img.id}
                                type="button"
                                className="aspect-square overflow-hidden rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                                onClick={() => setGallery({ images, index: idx })}
                              >
                                {src ? (
                                  <img src={src} alt={img.title || ""} className="h-full w-full object-cover rounded-lg" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs text-white/50">—</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="mb-4">
                        <BucketBlock title={mainLabel} images={mainImages} bucket={mainBucket} />
                      </div>
                      {hiddenBuckets.filter(({ images }) => images.length > 0).map(({ key, label, images }) => (
                        <details key={key} className="mb-2 rounded-lg border border-white/10 bg-black/10">
                          <summary className="cursor-pointer px-3 py-2 text-xs text-white/70">
                            {label} — {images.length} photos
                          </summary>
                          <div className="border-t border-white/10 p-3">
                            <BucketBlock title={label} images={images} bucket={key} />
                          </div>
                        </details>
                      ))}
                    </>
                  );
                })() : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-center">
                      <div className="text-xs text-white/50">0 likes</div>
                      <div className="mt-1 text-xl font-bold text-white">{stats.imagesByLikes.zero}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-center">
                      <div className="text-xs text-white/50">1 like</div>
                      <div className="mt-1 text-xl font-bold text-white">{stats.imagesByLikes.one}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-center">
                      <div className="text-xs text-white/50">2+ likes</div>
                      <div className="mt-1 text-xl font-bold text-white">{stats.imagesByLikes.twoPlus}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Галерея по клику */}
              {gallery && (
                <div
                  ref={galleryRef}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 outline-none"
                  tabIndex={0}
                  onClick={() => setGallery(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setGallery(null);
                    if (e.key === "ArrowLeft") setGallery((g) => (g ? { ...g, index: Math.max(0, g.index - 1) } : null));
                    if (e.key === "ArrowRight") setGallery((g) => (g ? { ...g, index: Math.min(g.images.length - 1, g.index + 1) } : null));
                  }}
                  role="dialog"
                  aria-label="Gallery"
                >
                  <button
                    type="button"
                    className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                    onClick={() => setGallery(null)}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  {gallery.images[gallery.index] && (
                    <>
                      <img
                        src={gallery.images[gallery.index].filePath || gallery.images[gallery.index].url || ""}
                        alt=""
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {gallery.images.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGallery((g) => (g ? { ...g, index: Math.max(0, g.index - 1) } : null));
                            }}
                            disabled={gallery.index === 0}
                            aria-label="Previous"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </button>
                          <button
                            type="button"
                            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGallery((g) => (g ? { ...g, index: Math.min(g.images.length - 1, g.index + 1) } : null));
                            }}
                            disabled={gallery.index === gallery.images.length - 1}
                            aria-label="Next"
                          >
                            <ChevronRight className="h-6 w-6" />
                          </button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
                            {gallery.index + 1} / {gallery.images.length}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
        </>
        )}

        {!stats && tab === "stats" && (
          <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6 text-white/50">Загрузка статистики…</div>
        )}

      </div>
    </div>
  );
}
