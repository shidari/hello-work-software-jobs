import Link from "next/link";
import styles from "./JobDetailPage.module.css";
import { JobDetailSkeleton } from "./JobDetailSkeleton";

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/jobs" className={styles.backLink}>
          &larr; 求人一覧に戻る
        </Link>
      </div>
      <JobDetailSkeleton />
    </div>
  );
}
