import type { ComponentProps } from "react";
import styles from "./Pagination.module.css";

export function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      aria-label="pagination"
      className={`${styles.pagination}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function PaginationContent({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      className={`${styles.paginationContent}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function PaginationItem(props: ComponentProps<"li">) {
  return <li {...props} />;
}

export function PaginationLink({
  isActive,
  className,
  ...props
}: ComponentProps<"button"> & { isActive?: boolean }) {
  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      className={`${styles.paginationLink}${isActive ? ` ${styles.active}` : ""}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function PaginationPrevious({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <PaginationLink
      aria-label="前のページ"
      className={`${styles.nav}${className ? ` ${className}` : ""}`}
      {...props}
    >
      &lsaquo; 前へ
    </PaginationLink>
  );
}

export function PaginationNext({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <PaginationLink
      aria-label="次のページ"
      className={`${styles.nav}${className ? ` ${className}` : ""}`}
      {...props}
    >
      次へ &rsaquo;
    </PaginationLink>
  );
}

export function PaginationEllipsis() {
  return (
    <span className={styles.ellipsis} aria-hidden>
      &hellip;
    </span>
  );
}
