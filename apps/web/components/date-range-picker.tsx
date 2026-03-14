"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DateRangePickerProps {
  onChange: (from: string, to: string) => void;
}

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1Y", days: 365 },
  { label: "YTD", days: -1 },
] as const;

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function DateRangePicker({ onChange }: DateRangePickerProps) {
  const [active, setActive] = useState("30d");
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  function handlePreset(preset: (typeof PRESETS)[number]) {
    setActive(preset.label);
    setCustomMode(false);

    const to = new Date();
    let from: Date;

    if (preset.days === -1) {
      from = new Date(to.getFullYear(), 0, 1);
    } else {
      from = new Date();
      from.setDate(from.getDate() - preset.days);
    }

    onChange(formatDate(from), formatDate(to));
  }

  function handleCustomApply() {
    if (customFrom && customTo) {
      setActive("custom");
      onChange(customFrom, customTo);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.label}
          variant={active === p.label ? "default" : "outline"}
          size="sm"
          onClick={() => handlePreset(p)}
        >
          {p.label}
        </Button>
      ))}
      <Button
        variant={customMode ? "default" : "outline"}
        size="sm"
        onClick={() => setCustomMode(!customMode)}
      >
        Custom
      </Button>
      {customMode && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 w-full sm:w-36"
          />
          <span className="text-sm text-muted-foreground hidden sm:inline">to</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 w-full sm:w-36"
          />
          <Button size="sm" onClick={handleCustomApply} className="w-full sm:w-auto">
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
