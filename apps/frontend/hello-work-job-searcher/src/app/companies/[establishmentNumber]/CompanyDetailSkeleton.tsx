import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./CompanyDetailPage.module.css";

const LABEL_TERMS = [
  "会社名",
  "郵便番号",
  "所在地",
  "従業員数",
  "設立年",
  "資本金",
  "事業内容",
  "法人番号",
] as const;

const JOB_SKELETON_IDS = ["a", "b", "c"] as const;

export function CompanyDetailSkeleton() {
  return (
    <article className={styles.article}>
      <h2 className={styles.title}>
        <Skeleton className={styles.titleSkeleton} />
        <span className={styles.subtitle}>
          事業所番号: <Skeleton className={styles.subtitleSkeleton} />
        </span>
      </h2>
      <div className={styles.labels}>
        {LABEL_TERMS.map((term) => (
          <Label key={term} term={term}>
            <Skeleton className={styles.valueSkeleton} />
          </Label>
        ))}
      </div>

      <h3 className={styles.jobsHeading}>この事業所の求人</h3>
      <ul className={styles.jobs}>
        {JOB_SKELETON_IDS.map((id) => (
          <li key={id} className={styles.jobItem}>
            <div className={styles.jobLink}>
              <Skeleton className={styles.jobOccupationSkeleton} />
              <Skeleton className={styles.jobMetaSkeleton} />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
