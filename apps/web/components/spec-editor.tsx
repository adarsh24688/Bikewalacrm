"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Specification {
  key: string;
  value: string;
}

interface SpecEditorProps {
  value: Specification[];
  onChange: (value: Specification[]) => void;
}

const PRESET_KEYS = [
  "Engine",
  "Displacement",
  "Max Power",
  "Max Torque",
  "Mileage",
  "Kerb Weight",
  "Fuel Tank",
  "Top Speed",
  "Transmission",
  "Brakes (Front)",
  "Brakes (Rear)",
  "Tyre (Front)",
  "Tyre (Rear)",
  "Battery",
  "Range",
  "Charging Time",
];

export function SpecEditor({ value, onChange }: SpecEditorProps) {
  const add = () => {
    onChange([...value, { key: "", value: "" }]);
  };

  const update = (index: number, field: "key" | "value", val: string) => {
    const updated = [...value];
    updated[index][field] = val;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const usedKeys = new Set(value.map((s) => s.key));
  const suggestions = PRESET_KEYS.filter((k) => !usedKeys.has(k));

  return (
    <div className="space-y-3">
      {value.map((spec, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Spec name"
            value={spec.key}
            onChange={(e) => update(i, "key", e.target.value)}
            list="spec-suggestions"
            className="flex-1"
          />
          <Input
            placeholder="Value"
            value={spec.value}
            onChange={(e) => update(i, "value", e.target.value)}
            className="flex-1"
          />
          <Button variant="ghost" size="sm" onClick={() => remove(i)}>
            ✕
          </Button>
        </div>
      ))}
      <datalist id="spec-suggestions">
        {suggestions.map((key) => (
          <option key={key} value={key} />
        ))}
      </datalist>
      <Button variant="outline" size="sm" onClick={add}>
        + Add Spec
      </Button>
    </div>
  );
}
