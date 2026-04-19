import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./JobDetailPage.module.css";

const LABEL_TERMS = [
  "企業名",
  "職種",
  "求人区分",
  "職務概要",
  "賃金",
  "就業場所",
  "紹介期限",
  "勤務時間",
  "必須資格",
] as const;

export function JobDetailSkeleton() {
  return (
    <article className={styles.detailArticle}>
      <h2 className={styles.detailTitle}>
        求人番号:
        <Skeleton className={styles.detailTitleNumber} />
      </h2>
      <div className={styles.detailLabels}>
        {LABEL_TERMS.map((term) => (
          <Label key={term} term={term}>
            <Skeleton className={styles.detailValueSkeleton} />
          </Label>
        ))}
      </div>
    </article>
  );
}
