"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface GenerateAIButtonProps {
  leadId?: string;
  actionType: string;
  onGenerated: (message: string) => void;
}

export function GenerateAIButton({
  leadId,
  actionType,
  onGenerated,
}: GenerateAIButtonProps) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/ai/status`)
      .then((r) => r.json())
      .then((d) => setAvailable(d.available))
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/generate-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, actionType }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      onGenerated(data.message);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={loading}
    >
      {loading ? "Generating..." : "Generate with AI"}
    </Button>
  );
}
