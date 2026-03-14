"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Trim {
  name: string;
  priceDiff: number;
}

interface TrimEditorProps {
  value: Trim[];
  onChange: (value: Trim[]) => void;
}

export function TrimEditor({ value, onChange }: TrimEditorProps) {
  const add = () => {
    onChange([...value, { name: "", priceDiff: 0 }]);
  };

  const update = (index: number, field: keyof Trim, val: string | number) => {
    const updated = [...value];
    if (field === "priceDiff") {
      updated[index].priceDiff = Number(val);
    } else {
      updated[index].name = val as string;
    }
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {value.map((trim, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Trim name (e.g. DLX, Anniversary Edition)"
            value={trim.name}
            onChange={(e) => update(i, "name", e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Price diff"
            value={trim.priceDiff}
            onChange={(e) => update(i, "priceDiff", e.target.value)}
            className="w-32"
          />
          <Button variant="ghost" size="sm" onClick={() => remove(i)}>
            ✕
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        + Add Trim
      </Button>
    </div>
  );
}
