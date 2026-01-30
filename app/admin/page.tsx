"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, Link as LinkIcon, Copy, Check, Server, FolderOpen, Plus, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectItem {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { images: number; links: number };
}

interface ServerInfo {
  memory: { totalMb: number; freeMb: number; usedMb: number; usedPercent: number };
  processMemory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  load: number[];
  uptimeSeconds: number;
  disk?: { total?: string; used?: string; free?: string; percent?: string };
}

interface UploadProgress {
  total: number;
  uploaded: number;
  failed: number;
  errors: string[];
}

export default function AdminPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingServer, setLoadingServer] = useState(true);

  const [title, setTitle] = useState("");
  const [titleValidation, setTitleValidation] = useState<{
    isValid: boolean;
    message: string;
    checking: boolean;
  }>({ isValid: false, message: "", checking: false });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [creating, setCreating] = useState(false);
  const [reviewSetId, setReviewSetId] = useState<string | null>(null);
  const [clientLink, setClientLink] = useState<string | null>(null);
  const [adminLink, setAdminLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    if (!title.trim() || reviewSetId) {
      setTitleValidation({ isValid: false, message: "", checking: false });
      return;
    }

    const validation = validateTitle(title);
    if (!validation.isValid) {
      setTitleValidation({ ...validation, checking: false });
      return;
    }

    setTitleValidation({ isValid: false, message: "Checking...", checking: true });

    validationTimeoutRef.current = setTimeout(async () => {
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
  }, [title, reviewSetId]);

  const borderColor = reviewSetId
    ? "border-white/10"
    : titleValidation.isValid
      ? "border-green-500/50 focus:border-green-500"
      : title.length > 0 && !titleValidation.checking
        ? "border-red-500/50 focus:border-red-500"
        : "border-white/10";

  useEffect(() => {
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
  }, [reviewSetId, clientLink]);

  useEffect(() => {
    fetch("/api/admin/server-info")
      .then((res) => res.json())
      .then((data) => {
        setServerInfo(data);
        setLoadingServer(false);
      })
      .catch(() => setLoadingServer(false));
  }, []);

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!reviewSetId) {
      alert("Please create a project first");
      return;
    }

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
        const isZip = file.name.toLowerCase().endsWith('.zip');
        
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("reviewSetId", reviewSetId);

          const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
          const data = await res.json();
          
          if (data.success) {
            if (isZip && data.files) {
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
      // Очищаем прогресс через 5 секунд
      setTimeout(() => {
        setUploadProgress(null);
      }, 5000);
    }
  }

  async function addImageToDB(filePath: string) {
    if (!reviewSetId) return;
    try {
      const res = await fetch(`/api/admin/review-sets/${reviewSetId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setImages((prev) => [...prev, filePath]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function createProject() {
    if (!titleValidation.isValid) {
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/review-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setReviewSetId(data.id);
        
        // Автоматически создаем ссылку
        try {
          const linkRes = await fetch(`/api/admin/review-sets/${data.id}/links`, { method: "POST" });
          if (linkRes.ok) {
            const linkData = await linkRes.json();
            const baseUrl = window.location.origin;
            const projectUrl = `${baseUrl}/r/${linkData.token}`;
            const adminUrl = linkData.adminToken ? `${baseUrl}/admin/results/${linkData.adminToken}` : null;
            
            // Копируем ссылку в буфер обмена
            navigator.clipboard.writeText(projectUrl);
            
            // Показываем сообщение
            alert(`Project created! Address copied to clipboard: ${projectUrl}`);
            
            // Устанавливаем ссылки для отображения
            setClientLink(projectUrl);
            setAdminLink(adminUrl);
          } else {
            // Если не удалось создать ссылку, все равно показываем что проект создан
            alert("Project created, but failed to create link. You can create it manually later.");
          }
        } catch (linkError) {
          console.error("Error creating link:", linkError);
          alert("Project created, but failed to create link. You can create it manually later.");
        }
      } else {
        alert(data.error || "Error creating project");
        setTitleValidation({
          isValid: false,
          message: data.error || "Creation error",
          checking: false,
        });
      }
    } catch (error: any) {
      alert(error.message || "Error creating project");
    } finally {
      setCreating(false);
    }
  }

  async function generateLink() {
    if (!reviewSetId || images.length === 0) {
      alert("Please upload photos first");
      return;
    }
    try {
      const res = await fetch(`/api/admin/review-sets/${reviewSetId}/links`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const baseUrl = window.location.origin;
        const linkUrl = `${baseUrl}/r/${data.token}`;
        setClientLink(linkUrl);
        setAdminLink(`${baseUrl}/admin/results/${data.adminToken}`);
        
        // Копируем ссылку в буфер обмена
        navigator.clipboard.writeText(linkUrl);
        alert(`Link created! Address copied to clipboard: ${linkUrl}`);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error creating link");
      }
    } catch (e) {
      alert("Error creating link");
    }
  }

  function copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
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
        <h1 className="mb-8 text-3xl font-bold text-white">Admin</h1>

        {/* Server */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
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
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-500/80"
                    style={{ width: `${Math.min(serverInfo.memory.usedPercent, 100)}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Process (RSS)</div>
                <div className="mt-1 font-mono text-sm text-white">{serverInfo.processMemory.rssMb} MB</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Load (1 / 5 / 15 min)</div>
                <div className="mt-1 font-mono text-sm text-white">
                  {serverInfo.load.map((l) => l.toFixed(2)).join(" / ")}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Uptime</div>
                <div className="mt-1 font-mono text-sm text-white">{formatUptime(serverInfo.uptimeSeconds)}</div>
              </div>
              {serverInfo.disk && (serverInfo.disk.total || serverInfo.disk.used) && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Disk</div>
                  <div className="mt-1 font-mono text-sm text-white">
                    {serverInfo.disk.used} / {serverInfo.disk.total} ({serverInfo.disk.percent})
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-white/50">Data unavailable</div>
          )}
        </div>

        {/* Projects List */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <FolderOpen className="h-5 w-5" />
            Projects
          </h2>
          {loadingProjects ? (
            <div className="text-white/50">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-white/50">
              No projects. Create a new one below.
            </div>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/review-sets/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4 text-white transition hover:bg-white/5"
                  >
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-white/50">
                        {p._count.images} photos · {p._count.links} links · {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/50" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create New Project */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="mb-4 flex w-full items-center justify-between text-left text-xl font-semibold text-white hover:text-white/90"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Project
            </span>
            <span className="text-white/50">{showCreateForm ? "−" : "+"}</span>
          </button>

          {showCreateForm && (
            <>
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-white/80">Project Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="my-project (English letters, numbers, dashes only)"
                  disabled={!!reviewSetId}
                  className={`w-full rounded-md border-2 ${borderColor} bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                    titleValidation.isValid && !reviewSetId
                      ? "focus:ring-green-500/30"
                      : title.length > 0 && !titleValidation.checking
                        ? "focus:ring-red-500/30"
                        : "focus:ring-white/20"
                  } transition-colors disabled:opacity-50`}
                  onKeyPress={(e) => e.key === "Enter" && !reviewSetId && titleValidation.isValid && createProject()}
                />
                {title.length > 0 && !reviewSetId && (
                  <>
                    <div
                      className={`mt-2 text-xs ${
                        titleValidation.isValid
                          ? "text-green-400"
                          : titleValidation.checking
                            ? "text-white/50"
                            : "text-red-400"
                      }`}
                    >
                      {titleValidation.message || "Enter project name"}
                    </div>
                    {titleValidation.isValid && !titleValidation.checking && (
                      <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                        <div className="text-xs text-green-400 mb-1">Project will be available at:</div>
                        <div className="font-mono text-sm text-green-300 break-all">
                          {typeof window !== "undefined" ? `${window.location.origin}/r/${createSlug(title)}` : ""}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {!reviewSetId && (
                  <Button
                    onClick={createProject}
                    disabled={creating || !titleValidation.isValid}
                    className="mt-3 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create Project"}
                  </Button>
                )}
              </div>

              {reviewSetId && (
                <>
                  <div className="mb-6">
                    <h3 className="mb-4 text-lg font-semibold text-white">
                      Upload Photos ({images.length})
                    </h3>
                    <div className="mb-4">
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
                        className="bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photos or ZIP Archive
                      </Button>
                    </div>

                    {/* Upload Progress */}
                    {uploadProgress && (
                      <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-4">
                        <div className="mb-2 flex items-center justify-between text-sm text-white">
                          <span>Uploading: {uploadProgress.uploaded} / {uploadProgress.total}</span>
                          {uploadProgress.failed > 0 && (
                            <span className="text-red-400">Failed: {uploadProgress.failed}</span>
                          )}
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-emerald-500/80 transition-all"
                            style={{ width: `${(uploadProgress.uploaded / uploadProgress.total) * 100}%` }}
                          />
                        </div>
                        {uploadProgress.errors.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {uploadProgress.errors.map((error, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-red-400">
                                <X className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {images.length > 0 && (
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {images.map((img, idx) => (
                          <div key={idx} className="relative aspect-square overflow-hidden rounded-lg">
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {images.length > 0 && !clientLink && (
                    <div className="mb-6">
                      <Button onClick={generateLink} className="bg-white/10 text-white hover:bg-white/20">
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Generate Link
                      </Button>
                    </div>
                  )}

                  {clientLink && (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">Client Link</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={clientLink}
                            readOnly
                            className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white/80"
                          />
                          <Button onClick={() => copyToClipboard(clientLink, "client")} className="bg-white/10 text-white hover:bg-white/20">
                            {copied === "client" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">Results (Admin)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={adminLink || ""}
                            readOnly
                            className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white/80"
                          />
                          <Button
                            onClick={() => adminLink && copyToClipboard(adminLink, "admin")}
                            className="bg-white/10 text-white hover:bg-white/20"
                          >
                            {copied === "admin" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
