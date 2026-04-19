import { JobsListSkeleton } from "./JobsListSkeleton";
import styles from "./JobsPageClient.module.css";

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>求人情報一覧</h1>
      </div>
      <JobsListSkeleton />
    </div>
  );
}
