"use client";

import { FeedContent } from "@/components/FeedContent";

export default function ReviewPage({ params }: { params: { token: string } }) {
  return <FeedContent token={params.token} />;
}
