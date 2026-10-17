// CSV for spreadsheet apps. Cells starting with = + - @ are prefixed with an
// apostrophe so a malicious reflection or comment can't run as a formula
// in Excel / Google Sheets ("CSV injection").

type Cell = string | number | boolean | null | undefined;

function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  // BOM so Excel opens Chinese text as UTF-8.
  return "﻿" + [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
