"use client";

import { useSearchParams } from "next/navigation";
import { naturals } from "@/util";
import styles from "./JobsPagination.module.css";
import { PageLink } from "./PageLink";

/**
 * ページネーションに表示するページ番号の配列を生成する。
 *
 * - 7ページ以下: 全ページを表示
 * - 8ページ以上: [1, ..., current-1, current, current+1, ..., last] の形式
 *
 * @example
 * pageNumbers(1, 5)   // [1, 2, 3, 4, 5]
 * pageNumbers(5, 50)  // [1, "...", 4, 5, 6, "...", 50]
 * pageNumbers(1, 50)  // [1, 2, 3, "...", 50]
 * pageNumbers(50, 50) // [1, "...", 49, 50]
 */
export function pageNumbers(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) {
    return Iterator.from(naturals()).drop(1).take(total).toArray();
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}

export function JobsPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const searchParams = useSearchParams();
  const filterParams = new URLSearchParams(
    searchParams
      ? [...searchParams].filter(([queryKey]) => queryKey !== "page")
      : [],
  );

  if (totalPages <= 1) return null;

  const pages = pageNumbers(currentPage, totalPages);
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      {isFirst ? (
        <span className={`${styles.page} ${styles.disabled}`} aria-disabled>
          前へ
        </span>
      ) : (
        <PageLink href={`/jobs?page=${currentPage - 1}&${filterParams}`}>
          前へ
        </PageLink>
      )}
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={i < pages.length / 2 ? "ellipsis-left" : "ellipsis-right"}
            className={styles.ellipsis}
          >
            …
          </span>
        ) : p === currentPage ? (
          <span
            key={p}
            className={`${styles.page} ${styles.active}`}
            aria-current="page"
          >
            {p}
          </span>
        ) : (
          <PageLink key={p} href={`/jobs?page=${p}&${filterParams}`}>
            {p}
          </PageLink>
        ),
      )}
      {isLast ? (
        <span className={`${styles.page} ${styles.disabled}`} aria-disabled>
          次へ
        </span>
      ) : (
        <PageLink href={`/jobs?page=${currentPage + 1}&${filterParams}`}>
          次へ
        </PageLink>
      )}
    </nav>
  );
}
