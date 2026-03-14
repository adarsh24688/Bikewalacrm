export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; label: string }[]
) {
  if (data.length === 0) return;

  const cols = columns || Object.keys(data[0]).map((k) => ({ key: k, label: k }));
  const header = cols.map((c) => c.label).join(",");

  const rows = data.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key];
        const str = val === null || val === undefined ? "" : String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
