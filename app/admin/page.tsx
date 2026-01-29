"use client";

import { useState, useRef } from "react";
import { Upload, Link as LinkIcon, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reviewSetId, setReviewSetId] = useState<string | null>(null);
  const [clientLink, setClientLink] = useState<string | null>(null);
  const [adminLink, setAdminLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Валидация названия в реальном времени
  const isValidTitle = title.trim().length > 0;
  const borderColor = reviewSetId 
    ? "border-white/10" 
    : isValidTitle 
      ? "border-green-500/50 focus:border-green-500" 
      : title.length > 0 
        ? "border-red-500/50 focus:border-red-500" 
        : "border-white/10";

  async function handleFileUpload(files: FileList | null, isZip: boolean = false) {
    if (!files || files.length === 0) return;
    
    // Проект должен быть создан заранее
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
        formData.append("reviewSetId", reviewSetId!);

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.files) {
          for (const filePath of data.files) {
            await addImageToDB(filePath);
          }
        } else {
          alert(data.error || "Ошибка при загрузке ZIP");
        }
      } else {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("reviewSetId", reviewSetId!);

          const res = await fetch("/api/admin/upload", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (data.success && data.filePath) {
            await addImageToDB(data.filePath);
          } else {
            alert(data.error || "Ошибка при загрузке файла");
          }
        }
      }
    } catch (error) {
      console.error("Error uploading files:", error);
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
      } else {
        const errorData = await res.json();
        console.error("Error adding image:", errorData);
      }
    } catch (error) {
      console.error("Error adding image to DB:", error);
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
        const errorMsg = data.error || "Ошибка при создании проекта";
        console.error("Error:", errorMsg);
        alert(errorMsg);
      }
    } catch (error: any) {
      console.error("Error creating project:", error);
      alert(`Ошибка при создании проекта: ${error.message || "Неизвестная ошибка"}`);
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
      const res = await fetch(`/api/admin/review-sets/${reviewSetId}/links`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        const baseUrl = window.location.origin;
        setClientLink(`${baseUrl}/r/${data.token}`);
        setAdminLink(`${baseUrl}/admin/results/${data.adminToken}`);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Ошибка при создании ссылки");
      }
    } catch (error) {
      console.error("Error generating link:", error);
      alert("Ошибка при создании ссылки");
    }
  }

  function copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl p-8">
        <h1 className="mb-8 text-3xl font-bold text-white">Создать проект</h1>

        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          {/* Название проекта - всегда видно */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Название проекта
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название"
              disabled={!!reviewSetId}
              className={`w-full rounded-md border-2 ${borderColor} bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                isValidTitle && !reviewSetId ? "focus:ring-green-500/30" : 
                title.length > 0 && !isValidTitle ? "focus:ring-red-500/30" : 
                "focus:ring-white/20"
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

          {/* Загрузка файлов - всегда видна */}
          <div className="mb-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Загрузить фотографии ({images.length})
            </h2>

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
                  disabled={uploading || !reviewSetId}
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
                  disabled={uploading || !reviewSetId}
                  className="bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Загрузить ZIP архив
                </Button>
              </div>
            </div>

            {uploading && (
              <div className="text-white/60">Загрузка...</div>
            )}

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square overflow-hidden rounded-lg">
                    <img
                      src={img}
                      alt={`Image ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Генерация ссылки */}
          {images.length > 0 && !clientLink && (
            <div className="mb-6">
              <Button
                onClick={generateLink}
                className="bg-white/10 text-white hover:bg-white/20"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Сформировать ссылку
              </Button>
            </div>
          )}

          {/* Показ ссылок */}
          {clientLink && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Ссылка для клиента
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clientLink}
                    readOnly
                    className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white/80 font-mono text-sm"
                  />
                  <Button
                    onClick={() => copyToClipboard(clientLink, "client")}
                    className="bg-white/10 text-white hover:bg-white/20"
                  >
                    {copied === "client" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Ссылка для просмотра результатов (админ)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adminLink || ""}
                    readOnly
                    className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white/80 font-mono text-sm"
                  />
                  <Button
                    onClick={() => adminLink && copyToClipboard(adminLink, "admin")}
                    className="bg-white/10 text-white hover:bg-white/20"
                  >
                    {copied === "admin" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
