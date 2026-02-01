"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, Server, FolderOpen, X, Trash2, Activity, GripVertical, Copy, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectItem {
  id: string;
  slug?: string;
  title: string;
  description: string | null;
  icon?: string | null;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { images: number; links: number; ratings: number };
  firstLink: { token: string; adminToken: string | null } | null;
}

interface ServerInfo {
  memory: { totalMb: number; freeMb: number; usedMb: number; usedPercent: number };
  processMemory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  load: number[];
  uptimeSeconds: number;
  disk?: { total?: string; used?: string; free?: string; percent?: string };
}

interface HealthCheck {
  ok: boolean;
  checks: Record<string, { ok: boolean; message: string; detail?: string }>;
  timestamp: string;
}

interface UploadProgress {
  total: number;
  uploaded: number;
  failed: number;
  errors: string[];
  /** Текущий файл (1-based) */
  currentFile?: number;
  /** Всего файлов */
  totalFiles?: number;
  /** В текущем архиве фото (если ZIP) */
  zipTotal?: number;
  /** Добавлено из архива в проект */
  zipDone?: number;
}

export default function AdminPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingServer, setLoadingServer] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const [title, setTitle] = useState("");
  const [titleValidation, setTitleValidation] = useState<{
    isValid: boolean;
    message: string;
    checking: boolean;
  }>({ isValid: false, message: "", checking: false });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<Record<number, string>>({});
  const [createButtonText, setCreateButtonText] = useState<string>("Create");
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [origin, setOrigin] = useState("https://app.ubernatural.io");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const urls: Record<number, string> = {};
    pendingFiles.forEach((f, i) => {
      if (f.type.startsWith("image/")) urls[i] = URL.createObjectURL(f);
    });
    setPendingPreviews((prev) => {
      Object.values(prev).forEach(URL.revokeObjectURL);
      return urls;
    });
    return () => Object.values(urls).forEach(URL.revokeObjectURL);
  }, [pendingFiles]);

  // Функция для создания slug
  function createSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Валидация названия
  function validateTitle(text: string): { isValid: boolean; message: string } {
    const trimmed = text.trim();
    
    if (!trimmed) {
      return { isValid: false, message: "" };
    }

    // Проверка на русские буквы
    const hasRussian = /[а-яёА-ЯЁ]/.test(trimmed);
    if (hasRussian) {
      return {
        isValid: false,
        message: "Russian letters are not allowed. Name is used as URL",
      };
    }

    // Проверка на английские буквы, цифры, дефисы, подчеркивания
    const englishOnly = /^[a-zA-Z0-9-_]+$/.test(trimmed);
    if (!englishOnly) {
      return {
        isValid: false,
        message: "Only English letters, numbers, dashes and underscores allowed",
      };
    }

    if (trimmed.length < 2) {
      return {
        isValid: false,
        message: "Minimum 2 characters",
      };
    }

    return { isValid: true, message: "OK" };
  }

  // Проверка уникальности через API
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    if (!title.trim()) {
      setTitleValidation({ isValid: false, message: "", checking: false });
      return;
    }

    // Сначала проверяем базовую валидацию (русские буквы, формат и т.д.)
    const validation = validateTitle(title);
    if (!validation.isValid) {
      // Если базовая валидация не прошла, сразу устанавливаем ошибку
      setTitleValidation({ ...validation, checking: false });
      return;
    }

    // Только если базовая валидация прошла, проверяем уникальность
    setTitleValidation({ isValid: false, message: "Checking...", checking: true });

    validationTimeoutRef.current = setTimeout(async () => {
      // Повторно проверяем базовую валидацию перед запросом к API
      const revalidation = validateTitle(title);
      if (!revalidation.isValid) {
        setTitleValidation({ ...revalidation, checking: false });
        return;
      }

      const slug = createSlug(title);
      try {
        const res = await fetch("/api/admin/review-sets/check-slug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const data = await res.json();
        
        if (data.available) {
          setTitleValidation({ isValid: true, message: "OK", checking: false });
        } else {
          setTitleValidation({
            isValid: false,
            message: "This URL is already taken",
            checking: false,
          });
        }
      } catch (error) {
        setTitleValidation({
          isValid: false,
          message: "Check error",
          checking: false,
        });
      }
    }, 500);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [title]);

  const borderColor = title.length > 0 && !titleValidation.checking
    ? titleValidation.isValid
      ? "border-green-500/50 focus:border-green-500"
      : "border-red-500/50 focus:border-red-500"
    : "border-white/10";

  function loadProjects() {
    fetch("/api/admin/review-sets")
      .then((res) => res.json())
      .then((data) => {
        setProjects(Array.isArray(data) ? data : []);
        setLoadingProjects(false);
      })
      .catch(() => {
        setProjects([]);
        setLoadingProjects(false);
      });
  }

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    fetch("/api/admin/server-info")
      .then((res) => res.json())
      .then((data) => {
        if (data && !("error" in data) && data.memory) setServerInfo(data);
        setLoadingServer(false);
      })
      .catch(() => setLoadingServer(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/health")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.ok === "boolean" && data.checks) setHealth(data);
        setLoadingHealth(false);
      })
      .catch(() => setLoadingHealth(false));
  }, []);

  function addPendingFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function createProject() {
    if (!titleValidation.isValid) return;
    setCreating(true);
    setCreateButtonText("Creating...");
    try {
      const res = await fetch("/api/admin/review-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTitleValidation({ isValid: false, message: data.error || "Error", checking: false });
        setCreateButtonText("Create");
        setCreating(false);
        return;
      }
      const projectId = data.id;

      // Загружаем фото — с прогрессом по файлам и по фото в архиве
      if (pendingFiles.length > 0) {
        const totalFiles = pendingFiles.length;
        setUploadProgress({
          total: totalFiles,
          uploaded: 0,
          failed: 0,
          errors: [],
          currentFile: 1,
          totalFiles,
        });
        let uploaded = 0;
        let fileIndex = 0;
        for (const file of pendingFiles) {
          fileIndex++;
          setUploadProgress((p) =>
            p ? { ...p, currentFile: fileIndex, zipTotal: undefined, zipDone: undefined } : p
          );
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("reviewSetId", projectId);
            const upRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
            const upData = await upRes.json();
            if (upData.success) {
              if (upData.files && Array.isArray(upData.files)) {
                const zipTotal = upData.files.length;
                setUploadProgress((p) => (p ? { ...p, zipTotal, zipDone: 0 } : p));
                let zipDone = 0;
                for (const fp of upData.files) {
                  await fetch(`/api/admin/review-sets/${projectId}/images`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filePath: fp }),
                  });
                  zipDone++;
                  uploaded++;
                  setUploadProgress((p) => (p ? { ...p, zipDone, uploaded } : p));
                }
              } else if (upData.filePath) {
                await fetch(`/api/admin/review-sets/${projectId}/images`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ filePath: upData.filePath }),
                });
                uploaded++;
                setUploadProgress((p) => (p ? { ...p, uploaded } : p));
              }
            }
          } catch (_) {}
        }
        setUploadProgress(null);
      }

      const linkRes = await fetch(`/api/admin/review-sets/${projectId}/links`, { method: "POST" });
      const linkData = linkRes.ok ? await linkRes.json() : null;
      const projectUrl = linkData ? `${window.location.origin}/r/${linkData.token}` : "";
      if (projectUrl) navigator.clipboard.writeText(projectUrl);

      setCreateButtonText("Link copied");
      loadProjects();
      setTitle("");
      setPendingFiles([]);
      setTitleValidation({ isValid: false, message: "", checking: false });
      setTimeout(() => setCreateButtonText("Create"), 2500);
    } catch (e: any) {
      setCreateButtonText("Error");
      setTimeout(() => setCreateButtonText("Create"), 2000);
    } finally {
      setCreating(false);
    }
  }

  function formatUptime(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl p-8">
        {/* 1. Создание проекта — сверху, без кнопки + */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Create project</h2>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-white/80">URL проекта</label>
            <div
              className={`flex items-stretch overflow-hidden rounded-md border-2 ${borderColor} bg-white/5 focus-within:ring-2 focus-within:ring-white/20`}
            >
              <span className="flex items-center border-r border-white/10 bg-white/5 px-3 py-2 text-white/70 whitespace-nowrap text-sm">
                {origin}/
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="my-project"
                disabled={creating}
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-0 disabled:opacity-50"
                onKeyPress={(e) => e.key === "Enter" && titleValidation.isValid && createProject()}
              />
            </div>
            {title.length > 0 && (
              <div className={`mt-2 text-xs ${titleValidation.isValid ? "text-green-400" : titleValidation.checking ? "text-white/50" : "text-red-400"}`}>
                {titleValidation.message || "Enter name"}
              </div>
            )}
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-white/80">Photos</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.zip"
              multiple
              className="hidden"
              onChange={(e) => addPendingFiles(e.target.files)}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={creating}
              className="bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
            >
              <Upload className="mr-2 h-4 w-4" />
              Select photos or ZIP
            </Button>
            {pendingFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/5">
                    {pendingPreviews[i] ? (
                      <img src={pendingPreviews[i]} alt="" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-white/60">
                        {f.name}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white/80 hover:bg-red-500 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {uploadProgress != null && (
            <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-white">
                <span className="font-medium">
                  File {uploadProgress.currentFile ?? 1} of {uploadProgress.totalFiles ?? uploadProgress.total}
                </span>
                {uploadProgress.zipTotal != null && (
                  <span className="text-white/80">
                    · Archive has {uploadProgress.zipTotal} photos. Added to project: {uploadProgress.zipDone ?? 0} of {uploadProgress.zipTotal}
                  </span>
                )}
              </div>
              <div className="mb-1 flex justify-between text-xs text-white/60">
                <span>Added to project: {uploadProgress.uploaded} photos</span>
                {uploadProgress.totalFiles != null && (() => {
                  const cur = uploadProgress.currentFile ?? 1;
                  const totalF = uploadProgress.totalFiles;
                  const progressInCurrent =
                    uploadProgress.zipTotal != null
                      ? (uploadProgress.zipDone ?? 0) / Math.max(1, uploadProgress.zipTotal)
                      : uploadProgress.uploaded >= cur ? 1 : 0;
                  const pct = Math.min(100, Math.round(((cur - 1 + progressInCurrent) / totalF) * 100));
                  return <span>{pct}%</span>;
                })()}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
                  style={{
                    width: (() => {
                      const totalF = uploadProgress.totalFiles ?? uploadProgress.total;
                      const cur = uploadProgress.currentFile ?? 1;
                      const progressInCurrent =
                        uploadProgress.zipTotal != null
                          ? (uploadProgress.zipDone ?? 0) / Math.max(1, uploadProgress.zipTotal)
                          : uploadProgress.uploaded >= cur ? 1 : 0;
                      const pct = Math.min(100, ((cur - 1 + progressInCurrent) / totalF) * 100);
                      return `${pct}%`;
                    })(),
                  }}
                />
              </div>
              {uploadProgress.errors.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-red-400">
                  {uploadProgress.errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button
            onClick={createProject}
            disabled={creating || !titleValidation.isValid}
            className="bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
          >
            {createButtonText}
          </Button>
        </div>

        {/* 2. Все проекты */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <FolderOpen className="h-5 w-5" />
            Projects
          </h2>
          {loadingProjects ? (
            <div className="text-white/50">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-white/50">
              No projects. Create one above.
            </div>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li
                  key={p.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverId(p.id);
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverId(null);
                    const draggedId = e.dataTransfer.getData("text/plain");
                    if (!draggedId || draggedId === p.id) return;
                    const fromIndex = projects.findIndex((x) => x.id === draggedId);
                    const toIndex = projects.findIndex((x) => x.id === p.id);
                    if (fromIndex === -1 || toIndex === -1) return;
                    const next = [...projects];
                    const [removed] = next.splice(fromIndex, 1);
                    next.splice(toIndex, 0, removed);
                    setProjects(next);
                    setReordering(true);
                    fetch("/api/admin/review-sets/reorder", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ orderedIds: next.map((x) => x.id) }),
                    })
                      .then((res) => {
                        if (!res.ok) loadProjects();
                      })
                      .finally(() => setReordering(false));
                  }}
                  className={dragOverId === p.id ? "opacity-80" : ""}
                >
                  <div
                    className={`flex items-center justify-between rounded-lg border p-4 text-white transition hover:bg-white/5 ${
                      dragOverId === p.id ? "border-white/30 bg-white/10" : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", p.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-grab active:cursor-grabbing touch-none shrink-0 rounded p-1 text-white/40 hover:text-white/70 hover:bg-white/10"
                      title="Перетащите для изменения порядка"
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <Link href={`/admin/review-sets/${p.slug ?? p.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.icon && (
                          <span className="text-xl leading-none" role="img" aria-hidden>{p.icon}</span>
                        )}
                        <span className="font-medium">{p.title}</span>
                        {p.isDefault && (
                          <span className="rounded bg-amber-500/20 text-amber-300 text-xs px-1.5 py-0.5 font-medium">
                            Standard folder
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {p._count.images} photos · {p._count.links} links · {p._count.ratings} ratings · {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </Link>
                    {p.firstLink && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Скопировать ссылку"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const url = typeof window !== "undefined" ? `${window.location.origin}/r/${p.firstLink!.token}` : "";
                          if (url) navigator.clipboard.writeText(url);
                        }}
                        className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Link
                      href={`/admin/review-sets/${p.slug ?? p.id}?tab=settings`}
                      title="Настройки"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/admin/review-sets/${p.slug ?? p.id}?tab=stats`}
                      title="Статистика"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!confirm(`Delete project "${p.title}"?`)) return;
                        setDeletingProject(p.id);
                        try {
                          const res = await fetch(`/api/admin/review-sets/${p.slug ?? p.id}`, { method: "DELETE" });
                          if (res.ok) loadProjects();
                          else alert((await res.json()).error || "Error");
                        } finally {
                          setDeletingProject(null);
                        }
                      }}
                      disabled={deletingProject === p.id}
                      className="text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {reordering && (
            <p className="mt-2 text-xs text-white/50">Сохранение порядка…</p>
          )}
        </div>

        {/* 3. Состояние сервиса */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <Activity className="h-5 w-5" />
            Service check
          </h2>
          {loadingHealth ? (
            <div className="text-white/50">Loading...</div>
          ) : health ? (
            <div className="space-y-3">
              <div className={`rounded-lg px-3 py-1.5 text-sm font-medium ${health.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {health.ok ? "All good" : "Issues found"}
              </div>
              {Object.entries(health.checks).map(([key, c]) => (
                <div key={key} className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium capitalize text-white">{key.replace(/_/g, " ")}</span>
                    <span className={c.ok ? " text-emerald-400" : " text-red-400"}> — {c.message}</span>
                    {c.detail && (
                      <div className="mt-1 text-xs text-white/60 whitespace-pre-wrap break-words">
                        {c.detail}
                      </div>
                    )}
                    {key === "database" && !c.ok && c.detail && /allow_list|Fix:/i.test(c.detail) && (
                      <div className="mt-2 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 text-xs text-amber-200">
                        <strong>How to fix:</strong> Open your database provider (e.g. Supabase) → Settings → Database → Network → add this server&apos;s IP to the allow list (or 0.0.0.0/0 for dev).
                      </div>
                    )}
                  </div>
                  <span className={c.ok ? "text-emerald-400" : "text-red-400"}>{c.ok ? "✓" : "✗"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-white/50">Unavailable</div>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <Server className="h-5 w-5" />
            Server
          </h2>
          {loadingServer ? (
            <div className="text-white/50">Loading...</div>
          ) : serverInfo ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Memory</div>
                <div className="mt-1 font-mono text-sm text-white">
                  {serverInfo.memory.usedMb} / {serverInfo.memory.totalMb} MB ({serverInfo.memory.usedPercent}%)
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Load</div>
                <div className="mt-1 font-mono text-sm text-white">{serverInfo.load.map((l) => l.toFixed(2)).join(" / ")}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Uptime</div>
                <div className="mt-1 font-mono text-sm text-white">{formatUptime(serverInfo.uptimeSeconds)}</div>
              </div>
              {serverInfo.disk?.used && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Disk</div>
                  <div className="mt-1 font-mono text-sm text-white">{serverInfo.disk.used} / {serverInfo.disk.total}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-white/50">No data</div>
          )}
        </div>
      </div>
    </div>
  );
}
