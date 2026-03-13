"use client";

import Link from "next/link";
import { JobDetailCard } from "@/components/features/detail/JobDetail";
import type { JobDetail } from "@/dto";
import styles from "./JobDetailPage.module.css";

export function JobDetailPage({ job }: { job: JobDetail }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/jobs" className={styles.backLink}>
          &larr; 求人一覧に戻る
        </Link>
      </div>
      <JobDetailCard jobDetail={job} />
    </div>
  );
}
