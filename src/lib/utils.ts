export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  // Assuming dateStr is in YYYY-MM-DD format
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  // If it's a full ISO string
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('pt-BR');
    }
  }
  return dateStr;
}
