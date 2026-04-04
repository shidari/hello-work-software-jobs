/**
 * 0 から無限に1ずつ増え続ける自然数列。
 *
 * @example
 * [...naturals().take(5)] // [0, 1, 2, 3, 4]
 */
export function* naturals() {
  for (let i = 0; ; i++) {
    yield i;
  }
}

export function formatDate(isoDate: string) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}年${mm}月${dd}日`;
}
