"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api";

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
    if (!API_URL) {
      setAvailable(false);
      return;
    }

    fetch(`${API_URL}/ai/status`)
      .then((r) => r.json())
      .then((d) => setAvailable(d.available))
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  async function handleGenerate() {
    if (!API_URL) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/generate-message`, {
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
