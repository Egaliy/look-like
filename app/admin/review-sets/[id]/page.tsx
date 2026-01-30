"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Link as LinkIcon, Copy, ExternalLink, Trash2, BarChart3, X, Upload } from "lucide-react";
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
  const [showStats, setShowStats] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    uploaded: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkCreatedRef = useRef(false);

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
    linkCreatedRef.current = false; // Сбрасываем при загрузке новой страницы
  }, [params.id]);

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
        alert("Error adding image");
      }
    } catch (error) {
      alert("Error adding image");
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

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
          formData.append("reviewSetId", params.id as string);

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
    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}/images`, {
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
    if (!confirm("Delete this image?")) return;

    setDeletingImage(imageId);
    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}/images/${imageId}`, {
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

  async function deleteLink(linkId: string) {
    if (!confirm("Delete this link?")) return;

    setDeletingLink(linkId);
    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}/links/${linkId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      } else {
        alert("Error deleting link");
      }
    } catch (error) {
      alert("Error deleting link");
    } finally {
      setDeletingLink(null);
    }
  }

  async function deleteProject() {
    if (!confirm("Delete project? This action cannot be undone!")) return;

    setDeletingProject(true);
    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}`, {
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
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/admin/review-sets/${params.id}/links`, {
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

  function copyLink(token: string) {
    const url = `${window.location.origin}/r/${token}`;
    navigator.clipboard.writeText(url);
    alert("Link copied!");
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
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div>Project not found</div>
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
              <h1 className="text-3xl font-bold text-white">{reviewSet.title}</h1>
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
                      onClick={() => {
                        const url = typeof window !== "undefined" ? `${window.location.origin}/r/${reviewSet.links[0].token}` : `/r/${reviewSet.links[0].token}`;
                        navigator.clipboard.writeText(url);
                        alert("Link copied!");
                      }}
                      className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Copy className="h-3 w-3" />
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
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Images Section */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Images ({reviewSet.images.length})</h2>
            </div>

            <div className="mb-4 flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Image URL (optional)"
                className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                onKeyPress={(e) => e.key === "Enter" && addImage()}
              />
              <Button onClick={addImage} disabled={!newImageUrl.trim()} className="bg-white/10 text-white hover:bg-white/20">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

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

            {!reviewSet.images || reviewSet.images.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? "border-emerald-400/50 bg-emerald-400/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="text-white/50">
                  {isDragging ? "Drop files here" : "No images. Drag and drop files here or use the upload button above."}
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`grid grid-cols-2 gap-4 rounded-lg p-2 transition-colors ${
                  isDragging ? "bg-emerald-400/10 border-2 border-dashed border-emerald-400/50" : ""
                }`}
              >
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
                        <div className="flex h-32 items-center justify-center bg-white/5 text-white/50">No URL</div>
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
                {isDragging && (
                  <div className="col-span-2 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-emerald-400/50 bg-emerald-400/10 text-emerald-400">
                    Drop files here to add more images
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Statistics */}
          {stats && (
            <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">Statistics</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Images</div>
                  <div className="mt-1 text-2xl font-bold text-white">{stats.totalImages}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Links</div>
                  <div className="mt-1 text-2xl font-bold text-white">{stats.totalLinks}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Ratings</div>
                  <div className="mt-1 text-2xl font-bold text-white">{stats.totalRatings}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">Clients</div>
                  <div className="mt-1 text-2xl font-bold text-white">{stats.uniqueClients}</div>
                </div>
              </div>
              {stats.totalRatings > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/50">0 likes</div>
                    <div className="mt-1 text-xl font-bold text-white">{stats.imagesByLikes.zero}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/50">1 like</div>
                    <div className="mt-1 text-xl font-bold text-white">{stats.imagesByLikes.one}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/50">2+ likes</div>
                    <div className="mt-1 text-xl font-bold text-white">{stats.imagesByLikes.twoPlus}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Links Section */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Review Links ({reviewSet.links.length})</h2>
              <Button 
                onClick={generateLink} 
                disabled={generatingLink || !reviewSet.images || reviewSet.images.length === 0}
                className="bg-white/10 text-white hover:bg-white/20"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {generatingLink ? "Creating..." : "Create"}
              </Button>
            </div>

            {!reviewSet.links || reviewSet.links.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-white/50">
                No links. Create a link for clients.
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
                          Created: {new Date(link.createdAt).toLocaleString()}
                          {linkStats && ` • ${linkStats.ratingsCount} ratings`}
                        </div>
                        {resultsUrl && (
                          <a
                            href={resultsUrl}
                            className="mt-2 inline-block text-sm text-emerald-400 hover:text-emerald-300"
                          >
                            Results →
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
                              Results
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
