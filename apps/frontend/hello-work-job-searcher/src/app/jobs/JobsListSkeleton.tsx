import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./JobsPageClient.module.css";

const SKELETON_IDS = ["a", "b", "c", "d", "e"] as const;

function JobCardSkeleton() {
  return (
    <Card className={styles.cardSkeleton}>
      <Skeleton className={styles.cardSkeletonTitle} />
      <div className={styles.cardSkeletonDetails}>
        <Skeleton
          className={styles.cardSkeletonLine}
          style={{ width: "60%" }}
        />
        <Skeleton
          className={styles.cardSkeletonLine}
          style={{ width: "50%" }}
        />
        <Skeleton
          className={styles.cardSkeletonLine}
          style={{ width: "70%" }}
        />
        <Skeleton
          className={styles.cardSkeletonLine}
          style={{ width: "45%" }}
        />
      </div>
    </Card>
  );
}

export function JobsListSkeleton() {
  return (
    <>
      <div className={styles.totalCountSkeleton}>
        求人情報の総数:
        <Skeleton className={styles.totalCountNumberSkeleton} />件
      </div>
      <div className={styles.items}>
        {SKELETON_IDS.map((id) => (
          <div key={id} className={styles.cardLink}>
            <JobCardSkeleton />
          </div>
        ))}
      </div>
    </>
  );
}
