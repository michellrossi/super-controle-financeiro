
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  // Handle both YYYY-MM-DD and full ISO strings
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return new Date();
  
  const [y, m, d] = parts.map(Number);
  // Creating with new Date(y, m-1, d) uses local time at 00:00:00
  return new Date(y, m - 1, d);
};

export const toDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
