import type { Job, Unbrand } from "@sho/models";
import { Item } from "@/components/ui/Item";
import { ItemGroup } from "@/components/ui/ItemGroup";
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
      <ItemGroup variant="list">
        <Item variant="list" data-label="company-name" data-value={companyName}>
          企業名: {companyName}
        </Item>
        <Item variant="list" data-label="occupation" data-value={occupation}>
          職種: {occupation}
        </Item>
        <Item
          variant="list"
          data-label="employment-type"
          data-value={employmentType}
        >
          求人区分: {employmentType}
        </Item>
        <Item
          variant="list"
          data-label="job-description"
          data-value={jobDescription ?? "未記載"}
        >
          職務概要: {jobDescription ?? "未記載"}
        </Item>
        <Item
          variant="list"
          data-label="wage"
          data-value={`${wage.min}〜${wage.max}`}
        >
          賃金: {wage.min}円〜{wage.max}円
        </Item>
        <Item
          variant="list"
          data-label="work-place"
          data-value={workPlace ?? "未記載"}
        >
          就業場所: {workPlace ?? "未記載"}
        </Item>
        <Item variant="list" data-label="expiry-date" data-value={expiryDate}>
          紹介期限: {formatDate(expiryDate)}
        </Item>
        <Item
          variant="list"
          data-label="working-hours"
          data-value={`${workingHours.start}〜${workingHours.end}`}
        >
          勤務時間: {workingHours.start ?? "?"}〜{workingHours.end ?? "?"}
        </Item>
        <Item
          variant="list"
          data-label="qualifications"
          data-value={qualifications ?? "未記載"}
        >
          必須資格: {qualifications ?? "未記載"}
        </Item>
      </ItemGroup>
    </article>
  );
}
