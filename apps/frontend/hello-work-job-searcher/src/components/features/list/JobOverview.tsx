import { Label } from "@/components/ui/Label";
import type { JobOverview } from "@/dto";
import styles from "./JobOverview.module.css";

export function JobOverviewSummary(props: JobOverview) {
  const { companyName, occupation, employmentType, workPlace, employeeCount } =
    props;
  return (
    <div className={styles.root}>
      <span className={styles.companyName}>{companyName ?? "非公開"}</span>
      <div className={styles.details}>
        <Label term="職種">{occupation}</Label>
        <Label term="求人区分">{employmentType}</Label>
        <Label term="就業場所">{workPlace ?? "未記載"}</Label>
        <Label term="従業員数">
          {employeeCount != null ? `${employeeCount}人` : "未記載"}
        </Label>
      </div>
    </div>
  );
}
