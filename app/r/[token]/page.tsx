"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  X,
  Images,
  SlidersHorizontal,
  Undo2,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TOTAL = 50;

interface RefItem {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

interface SwipeCardProps {
  refItem: RefItem;
  onLike: () => void;
  onDislike: () => void;
}

function SwipeCard({ refItem, onLike, onDislike }: SwipeCardProps) {
  const [dragX, setDragX] = useState(0);

  const likeOpacity = clamp(mapRange(dragX, 40, 140, 0, 1), 0, 1);
  const nopeOpacity = clamp(mapRange(dragX, -40, -140, 0, 1), 0, 1);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={(_, info) => {
          const x = info.offset.x;
          setDragX(0);
          if (x > 120) onLike();
          else if (x < -120) onDislike();
        }}
        whileTap={{ cursor: "grabbing" }}
        style={{ x: dragX, rotate: dragX / 35 }}
        className="cursor-grab"
      >
        <Card className="h-[520px] overflow-hidden rounded-[28px] border-white/10 bg-white/5 shadow-2xl">
          <CardContent className="h-full p-0">
            <div className="relative h-full">
              <img
                src={refItem.url}
                alt={refItem.title}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/0" />

              <div className="absolute left-5 top-5">
                <div
                  className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100"
                  style={{ opacity: likeOpacity }}
                >
                  LIKE
                </div>
              </div>
              <div className="absolute right-5 top-5">
                <div
                  className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100"
                  style={{ opacity: nopeOpacity }}
                >
                  NOPE
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="text-lg font-semibold text-white">
                  {refItem.title}
                </div>
                {refItem.subtitle && (
                  <div className="mt-1 text-sm text-white/70">
                    {refItem.subtitle}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

interface CircleActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone: "good" | "danger" | "neutral";
}

function CircleAction({
  icon,
  label,
  onClick,
  disabled,
  tone,
}: CircleActionProps) {
  const toneClass =
    tone === "good"
      ? "text-emerald-100"
      : tone === "danger"
      ? "text-rose-100"
      : "text-white/80";

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={onClick}
        disabled={disabled}
        variant="ghost"
        className={`h-14 w-14 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 ${toneClass}`}
      >
        {icon}
      </Button>
      <div className="text-[11px] text-white/50">{label}</div>
    </div>
  );
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
) {
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

export default function ReviewPage({
  params,
}: {
  params: { token: string };
}) {
  const [mode, setMode] = useState<"feed" | "gallery">("feed");
  const [index, setIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<{ id: string; action: string }[]>([]);
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string>("");

  useEffect(() => {
    // Генерируем или получаем clientId из localStorage
    let storedClientId = localStorage.getItem(`clientId_${params.token}`);
    if (!storedClientId) {
      storedClientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`clientId_${params.token}`, storedClientId);
    }
    setClientId(storedClientId);

    // Load review set data
    fetch(`/api/r/${params.token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.images) {
          setRefs(
            data.images.map((img: any, i: number) => ({
              id: img.id,
              title: img.title || `Reference #${i + 1}`,
              subtitle: "Swipe to rate",
              url: img.filePath || img.url || "",
            }))
          );
        } else {
          // Fallback: use placeholder images
          setRefs(
            Array.from({ length: TOTAL }).map((_, i) => ({
              id: `ref-${i + 1}`,
              title: `Reference #${i + 1}`,
              subtitle: "Swipe to rate",
              url: `https://picsum.photos/seed/ref-${i + 1}/1200/900`,
            }))
          );
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback on error
        setRefs(
          Array.from({ length: TOTAL }).map((_, i) => ({
            id: `ref-${i + 1}`,
            title: `Reference #${i + 1}`,
            subtitle: "Swipe to rate",
            url: `https://picsum.photos/seed/ref-${i + 1}/1200/900`,
          }))
        );
        setLoading(false);
      });
  }, [params.token]);

  const remaining = Math.max(0, refs.length - index);
  const progress = Math.min(refs.length, index);

  const current = refs[index] ?? null;
  const next = refs[index + 1] ?? null;

  const likedList = useMemo(() => {
    const s = likedIds;
    return refs.filter((r) => s.has(r.id));
  }, [likedIds, refs]);

  function commit(action: "like" | "dislike") {
    if (!current) return;

    setHistory((h) => [...h, { id: current.id, action }]);

    if (action === "like") {
      setLikedIds((prev) => {
        const n = new Set(prev);
        n.add(current.id);
        return n;
      });
    } else {
      setLikedIds((prev) => {
        const n = new Set(prev);
        n.delete(current.id);
        return n;
      });
    }

    // Send event to API
    if (clientId) {
      fetch(`/api/r/${params.token}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: current.id,
          decision: action,
          orderIndex: index,
          clientId: clientId,
        }),
      }).catch(console.error);
    }

    setIndex((v) => Math.min(refs.length, v + 1));
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      const rest = h.slice(0, -1);

      setIndex((v) => Math.max(0, v - 1));

      setLikedIds((prev) => {
        const n = new Set(prev);
        if (last.action === "like") n.delete(last.id);
        return n;
      });

      return rest;
    });
  }

  const canUndo = history.length > 0 && index > 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-8 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10"
            disabled
            title="Settings (soon)"
          >
            <SlidersHorizontal className="h-5 w-5 text-white/60" />
          </Button>

          <div className="text-center">
            <div className="text-xs text-white/60">Rated</div>
            <div className="text-sm font-semibold text-white">
              {progress} / {refs.length}
            </div>
          </div>

          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10"
            onClick={() => setMode("gallery")}
            title="Gallery"
          >
            <Images className="h-5 w-5 text-white/90" />
          </Button>
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {mode === "gallery" ? (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="h-full"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10"
                    onClick={() => setMode("feed")}
                    title="Back"
                  >
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </Button>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Liked gallery
                    </div>
                    <div className="text-xs text-white/60">
                      {likedList.length} saved
                    </div>
                  </div>
                </div>

                <Card className="border-white/10 bg-white/5">
                  <CardContent className="p-3">
                    {likedList.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-center">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                          <Heart className="h-5 w-5 text-white/70" />
                        </div>
                        <div className="text-sm font-semibold text-white">
                          No likes yet
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          Swipe right or tap ❤️ to save references here.
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {likedList
                          .slice()
                          .reverse()
                          .map((r) => (
                            <div
                              key={r.id}
                              className="group overflow-hidden rounded-xl border border-white/10 bg-black/20"
                            >
                              <div className="relative aspect-[4/3]">
                                <img
                                  src={r.url}
                                  alt={r.title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
                                <div className="absolute bottom-2 left-2 right-2">
                                  <div className="text-xs font-semibold text-white/95">
                                    {r.title}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="feed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="h-full"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Rate references
                    </div>
                    <div className="text-xs text-white/60">
                      {remaining > 0
                        ? `${remaining} left to review`
                        : "Done — you reviewed all references"}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                    {Math.round((progress / refs.length) * 100)}%
                  </div>
                </div>

                <div className="relative mx-auto w-full">
                  {next && (
                    <div className="pointer-events-none absolute inset-0 translate-y-2 scale-[0.98]">
                      <Card className="h-[520px] overflow-hidden rounded-[28px] border-white/10 bg-white/5 shadow-2xl">
                        <CardContent className="h-full p-0">
                          <div className="relative h-full">
                            <img
                              src={next.url}
                              alt={next.title}
                              className="h-full w-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 bg-black/25" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <AnimatePresence>
                    {current ? (
                      <SwipeCard
                        key={current.id}
                        refItem={current}
                        onLike={() => commit("like")}
                        onDislike={() => commit("dislike")}
                      />
                    ) : (
                      <motion.div
                        key="done"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-[520px]"
                      >
                        <Card className="h-full overflow-hidden rounded-[28px] border-white/10 bg-white/5 shadow-2xl">
                          <CardContent className="flex h-full flex-col items-center justify-center p-8 text-center">
                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                              <Heart className="h-7 w-7 text-white/80" />
                            </div>
                            <div className="text-lg font-semibold text-white">
                              All done
                            </div>
                            <div className="mt-2 text-sm text-white/60">
                              You liked {likedList.length} out of {refs.length}{" "}
                              references.
                            </div>
                            <div className="mt-6 flex w-full gap-2">
                              <Button
                                className="w-full rounded-xl"
                                onClick={() => setMode("gallery")}
                              >
                                Open gallery
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-5 flex items-center justify-center gap-4">
                  <CircleAction
                    tone="danger"
                    icon={<X className="h-6 w-6" />}
                    label="Dislike"
                    onClick={() => commit("dislike")}
                    disabled={!current}
                  />

                  <CircleAction
                    tone="neutral"
                    icon={<Undo2 className="h-5 w-5" />}
                    label="Undo"
                    onClick={undo}
                    disabled={!canUndo}
                  />

                  <CircleAction
                    tone="good"
                    icon={<Heart className="h-6 w-6" />}
                    label="Like"
                    onClick={() => commit("like")}
                    disabled={!current}
                  />
                </div>

                <div className="mt-4 text-center text-xs text-white/45">
                  Tip: swipe the card left/right, or use the buttons.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
