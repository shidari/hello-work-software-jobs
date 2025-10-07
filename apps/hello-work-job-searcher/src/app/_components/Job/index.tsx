import { formatDate } from "../../util";
import styles from "./index.module.css";
import type { TJobDetail, TJobOverview } from "@sho/models";

export function JobOverview({
  companyName,
  jobTitle,
  employmentType,
  workPlace,
  employeeCount,
}: TJobOverview) {
  return (
    <div>
      <h2 data-label="comapny_name">{companyName}</h2>
      <ul>
        <li data-label="job-title" data-value="software_engineer">
          職種: {jobTitle}
        </li>
        <li data-label="employment-type" data-value="part_time">
          求人区分: {employmentType}
        </li>
        <li data-label="work-place" data-value="suginami">
          就業場所: {workPlace}
        </li>
        <li data-label="employee-count" data-value={employeeCount}>
          従業員数: {employeeCount}人
        </li>
      </ul>
    </div>
  );
}

export function JobDetail(props: { jobDetail: TJobDetail }) {
  const {
    jobNumber,
    companyName,
    jobTitle,
    employmentType,
    salary,
    workPlace,
    jobDescription,
    expiryDate,
    workingHours,
    qualifications,
  } = props.jobDetail;
  return (
    <article className={`${styles["layout-job-detail"]}`}>
      <h2>求人番号: {jobNumber}</h2>
      <ul className={`${styles["layout-job-detailList"]} ${styles["layout-job-detailList--primary"]}`}>
        <li data-label="company-name" data-value={companyName}>
          企業名: {companyName}
        </li>
        <li data-label="job-title" data-value={jobTitle}>
          職種: {jobTitle}
        </li>
        <li data-label="employment-type" data-value={employmentType}>
          求人区分: {employmentType}
        </li>
        <li data-label="job-description" data-value={jobDescription}>
          職務概要: {jobDescription}
        </li>
        <li data-label="salary" data-value={salary}>
          賃金: {salary}
        </li>
        <li data-label="work-place" data-value={workPlace} />
        就業場所: {workPlace}
        <li data-label="expiry-date" data-value={expiryDate}>
          紹介期限: {formatDate(expiryDate)}
        </li>
        <li data-label="working-hours" data-value={workingHours}>
          勤務時間: {workingHours}
        </li>
        <li
          data-label="qualifications"
          data-value={qualifications || "nothing"}
        >
          必須資格: {qualifications || "nothing"}
        </li>
      </ul>
    </article>
  );
}
