import type { Job, Unbrand } from "@sho/models";
import { Label, LabelGroup } from "@/components/ui/Label";
import { formatDate } from "@/util";
import styles from "./JobDetail.module.css";

export function JobDetail(props: { jobDetail: Unbrand<Job> }) {
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
    <article className={`${styles["layout-job-detail"]}`}>
      <h2>求人番号: {jobNumber}</h2>
      <LabelGroup>
        <Label data-label="company-name" data-value={companyName ?? "未記載"}>
          企業名: {companyName ?? "未記載"}
        </Label>
        <Label data-label="occupation" data-value={occupation}>
          職種: {occupation}
        </Label>
        <Label data-label="employment-type" data-value={employmentType}>
          求人区分: {employmentType}
        </Label>
        <Label
          data-label="job-description"
          data-value={jobDescription ?? "未記載"}
        >
          職務概要: {jobDescription ?? "未記載"}
        </Label>
        <Label
          data-label="wage"
          data-value={wage ? `${wage.min}〜${wage.max}` : "未記載"}
        >
          賃金: {wage ? `${wage.min}円〜${wage.max}円` : "未記載"}
        </Label>
        <Label data-label="work-place" data-value={workPlace ?? "未記載"}>
          就業場所: {workPlace ?? "未記載"}
        </Label>
        <Label data-label="expiry-date" data-value={expiryDate}>
          紹介期限: {formatDate(expiryDate)}
        </Label>
        <Label
          data-label="working-hours"
          data-value={
            workingHours
              ? `${workingHours.start}〜${workingHours.end}`
              : "未記載"
          }
        >
          勤務時間:{" "}
          {workingHours
            ? `${workingHours.start ?? "?"}〜${workingHours.end ?? "?"}`
            : "未記載"}
        </Label>
        <Label
          data-label="qualifications"
          data-value={qualifications ?? "未記載"}
        >
          必須資格: {qualifications ?? "未記載"}
        </Label>
      </LabelGroup>
    </article>
  );
}
