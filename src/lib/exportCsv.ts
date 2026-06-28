export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: { header: string; key: keyof T | ((row: T) => string | number | boolean | null | undefined) }[]
) {
  if (!data || !data.length) return;

  const headerRow = columns.map(col => `"${col.header}"`).join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      let val: any;
      if (typeof col.key === 'function') {
        val = col.key(row);
      } else {
        val = row[col.key];
      }
      
      // Escape quotes
      const strVal = String(val ?? '').replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(',');
  });

  const csvContent = [headerRow, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
