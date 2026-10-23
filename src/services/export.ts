import type { ExtractedData } from './openai';

function csvCell(value: string) {
    // Spreadsheet-facing CSV: keep separators inside the cell and mark formula-like text.
    // JSON remains the lossless interchange format; CSV handling varies by spreadsheet.
    let start = 0;
    while (start < value.length && (value.charCodeAt(start) <= 32 || /\s/u.test(value[start]))) start++;
    const formulaLike = /^[=+@\-＝＋＠－]/u.test(value.slice(start)) || [9, 10, 13].includes(value.charCodeAt(0));
    const text = formulaLike ? `'${value}` : value;
    return `"${text.replaceAll('"', '""')}"`;
}

export function extractionCsv(data: ExtractedData[]) {
    return ['Field,Value,Confidence', ...data.map(item =>
        [item.field, item.value, String(item.confidence)].map(csvCell).join(','),
    )].join('\r\n');
}
