"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, Link as LinkIcon, Copy, Check, Server, FolderOpen, Plus, ChevronRight } from "lucide-react";
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

export default function AdminPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingServer, setLoadingServer] = useState(true);

  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reviewSetId, setReviewSetId] = useState<string | null>(null);
  const [clientLink, setClientLink] = useState<string | null>(null);
  const [adminLink, setAdminLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const isValidTitle = title.trim().length > 0;
  const borderColor = reviewSetId
    ? "border-white/10"
    : isValidTitle
      ? "border-green-500/50 focus:border-green-500"
      : title.length > 0
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
  }, [reviewSetId, clientLink]); // обновляем список после создания проекта/ссылки

  useEffect(() => {
    fetch("/api/admin/server-info")
      .then((res) => res.json())
      .then((data) => {
        setServerInfo(data);
        setLoadingServer(false);
      })
      .catch(() => setLoadingServer(false));
  }, []);

  async function handleFileUpload(files: FileList | null, isZip: boolean = false) {
    if (!files || files.length === 0) return;
    if (!reviewSetId) {
      alert("Сначала создайте проект");
      return;
    }

    setUploading(true);
    try {
      if (isZip) {
        const file = files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("reviewSetId", reviewSetId);

        const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success && data.files) {
          for (const filePath of data.files) await addImageToDB(filePath);
        } else alert(data.error || "Ошибка при загрузке ZIP");
      } else {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("reviewSetId", reviewSetId);
          const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (data.success && data.filePath) await addImageToDB(data.filePath);
          else alert(data.error || "Ошибка при загрузке файла");
        }
      }
    } catch (error) {
      console.error(error);
      alert("Ошибка при загрузке файлов");
    } finally {
      setUploading(false);
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
      if (res.ok) {
        const data = await res.json();
        setImages((prev) => [...prev, data.filePath || data.url]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function createProject() {
    if (!title.trim()) {
      alert("Введите название проекта");
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
      } else {
        alert(data.error || "Ошибка при создании проекта");
      }
    } catch (error: any) {
      alert(error.message || "Ошибка при создании проекта");
    } finally {
      setCreating(false);
    }
  }

  async function generateLink() {
    if (!reviewSetId || images.length === 0) {
      alert("Сначала загрузите фотографии");
      return;
    }
    try {
      const res = await fetch(`/api/admin/review-sets/${reviewSetId}/links`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const baseUrl = window.location.origin;
        setClientLink(`${baseUrl}/r/${data.token}`);
        setAdminLink(`${baseUrl}/admin/results/${data.adminToken}`);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Ошибка при создании ссылки");
      }
    } catch (e) {
      alert("Ошибка при создании ссылки");
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
    return `${h}ч ${m}м`;
  }

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl p-8">
        <h1 className="mb-8 text-3xl font-bold text-white">Админ</h1>

        {/* Сервер */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <Server className="h-5 w-5" />
            Сервер
          </h2>
          {loadingServer ? (
            <div className="text-white/50">Загрузка...</div>
          ) : serverInfo ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Память</div>
                <div className="mt-1 font-mono text-sm text-white">
                  {serverInfo.memory.usedMb} / {serverInfo.memory.totalMb} МБ ({serverInfo.memory.usedPercent}%)
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-500/80"
                    style={{ width: `${Math.min(serverInfo.memory.usedPercent, 100)}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Процесс (RSS)</div>
                <div className="mt-1 font-mono text-sm text-white">{serverInfo.processMemory.rssMb} МБ</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Нагрузка (1 / 5 / 15 мин)</div>
                <div className="mt-1 font-mono text-sm text-white">
                  {serverInfo.load.map((l) => l.toFixed(2)).join(" / ")}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/50">Аптайм</div>
                <div className="mt-1 font-mono text-sm text-white">{formatUptime(serverInfo.uptimeSeconds)}</div>
              </div>
              {serverInfo.disk && (serverInfo.disk.total || serverInfo.disk.used) && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Диск</div>
                  <div className="mt-1 font-mono text-sm text-white">
                    {serverInfo.disk.used} / {serverInfo.disk.total} ({serverInfo.disk.percent})
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-white/50">Данные недоступны</div>
          )}
        </div>

        {/* Список проектов */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <FolderOpen className="h-5 w-5" />
            Проекты
          </h2>
          {loadingProjects ? (
            <div className="text-white/50">Загрузка...</div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-white/50">
              Нет проектов. Создайте новый ниже.
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
                        {p._count.images} фото · {p._count.links} ссылок · {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/50" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Создать новый проект */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="mb-4 flex w-full items-center justify-between text-left text-xl font-semibold text-white hover:text-white/90"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Создать новый проект
            </span>
            <span className="text-white/50">{showCreateForm ? "−" : "+"}</span>
          </button>

          {showCreateForm && (
            <>
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-white/80">Название проекта</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Введите название"
                  disabled={!!reviewSetId}
                  className={`w-full rounded-md border-2 ${borderColor} bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                    isValidTitle && !reviewSetId ? "focus:ring-green-500/30" : title.length > 0 ? "focus:ring-red-500/30" : "focus:ring-white/20"
                  } transition-colors disabled:opacity-50`}
                  onKeyPress={(e) => e.key === "Enter" && !reviewSetId && isValidTitle && createProject()}
                />
                {!reviewSetId && (
                  <Button
                    onClick={createProject}
                    disabled={creating || !isValidTitle}
                    className="mt-3 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    {creating ? "Создание..." : "Создать проект"}
                  </Button>
                )}
              </div>

              {reviewSetId && (
                <>
                  <div className="mb-6">
                    <h3 className="mb-4 text-lg font-semibold text-white">
                      Загрузить фотографии ({images.length})
                    </h3>
                    <div className="mb-4 flex gap-4">
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
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
                          Выбрать файлы
                        </Button>
                      </div>
                      <div>
                        <input
                          ref={zipInputRef}
                          type="file"
                          accept=".zip"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files, true)}
                        />
                        <Button
                          onClick={() => zipInputRef.current?.click()}
                          disabled={uploading}
                          className="bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          ZIP архив
                        </Button>
                      </div>
                    </div>
                    {uploading && <div className="text-white/60">Загрузка...</div>}
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
                        Сформировать ссылку
                      </Button>
                    </div>
                  )}

                  {clientLink && (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">Ссылка для клиента</label>
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
                        <label className="mb-2 block text-sm font-medium text-white/80">Результаты (админ)</label>
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
