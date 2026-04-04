import { Label } from "@/components/ui/Label";
import type { JobDetail } from "@/dto";
import { formatDate } from "@/util";
import styles from "./JobDetail.module.css";
import { WorkPlaceMap } from "./WorkPlaceMap";

export function JobDetailCard(props: { jobDetail: JobDetail }) {
  const {
    jobNumber,
    companyName,
    occupation,
    employmentType,
    wage,
    workPlace,
    jobDescription,
    expiryDate,
    workingHours,
    qualifications,
  } = props.jobDetail;
  return (
    <article className={styles["layout-job-detail"]}>
      <h2>求人番号: {jobNumber}</h2>
      <div className={styles.labels}>
        <Label term="企業名">{companyName ?? "未記載"}</Label>
        <Label term="職種">{occupation}</Label>
        <Label term="求人区分">{employmentType}</Label>
        <Label term="職務概要">{jobDescription ?? "未記載"}</Label>
        <Label term="賃金">
          {wage ? `${wage.min}円〜${wage.max}円` : "未記載"}
        </Label>
        <Label term="就業場所">{workPlace ?? "未記載"}</Label>
        {workPlace && <WorkPlaceMap address={workPlace} />}
        <Label term="紹介期限">{formatDate(expiryDate)}</Label>
        <Label term="勤務時間">
          {workingHours
            ? `${workingHours.start ?? "?"}〜${workingHours.end ?? "?"}`
            : "未記載"}
        </Label>
        <Label term="必須資格">{qualifications ?? "未記載"}</Label>
      </div>
    </article>
  );
}
