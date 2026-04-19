import Link from "next/link";
import { CompanyDetailSkeleton } from "./CompanyDetailSkeleton";
import styles from "./CompanyDetailPage.module.css";

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/jobs" className={styles.backLink}>
          &larr; 求人一覧に戻る
        </Link>
      </div>
      <CompanyDetailSkeleton />
    </div>
  );
}
