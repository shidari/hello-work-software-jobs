export function formatDate(isoDate: string) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}年${mm}月${dd}日`;
}
