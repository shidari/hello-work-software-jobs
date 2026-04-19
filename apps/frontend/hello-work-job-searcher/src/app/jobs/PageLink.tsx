"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import styles from "./JobsPagination.module.css";

function PageLinkStatus({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={pending ? styles.pending : undefined}
      aria-disabled={pending || undefined}
    >
      {children}
    </span>
  );
}

export function PageLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={styles.page}>
      <PageLinkStatus>{children}</PageLinkStatus>
    </Link>
  );
}
