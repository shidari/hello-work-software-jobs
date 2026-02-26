import { Schema } from "effect";
import { Item } from "@/components/ui/Item";
import { ItemGroup } from "@/components/ui/ItemGroup";
import { formatDate } from "@/util";
import styles from "./JobDetail.module.css";

const ISODateSchema = Schema.String.pipe(
  Schema.pattern(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
  ),
);

export const JobOverviewSchema = Schema.Struct({
  jobNumber: Schema.String,
  companyName: Schema.optional(Schema.String),
  workPlace: Schema.String,
  jobTitle: Schema.String,
  employmentType: Schema.String,
  employeeCount: Schema.Number,
  receivedDate: ISODateSchema,
});

export const JobDetailSchema = Schema.Struct({
  ...JobOverviewSchema.fields,
  salary: Schema.String,
  jobDescription: Schema.String,
  expiryDate: Schema.String,
  workingHours: Schema.String,
  qualifications: Schema.optional(Schema.String),
});

export type TJobOverview = typeof JobOverviewSchema.Type;
export type TJobDetail = typeof JobDetailSchema.Type;

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
      <ItemGroup variant="list">
        <Item variant="list" data-label="company-name" data-value={companyName}>
          企業名: {companyName}
        </Item>
        <Item variant="list" data-label="job-title" data-value={jobTitle}>
          職種: {jobTitle}
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
          data-value={jobDescription}
        >
          職務概要: {jobDescription}
        </Item>
        <Item variant="list" data-label="salary" data-value={salary}>
          賃金: {salary}
        </Item>
        <Item variant="list" data-label="work-place" data-value={workPlace}>
          就業場所: {workPlace}
        </Item>
        <Item variant="list" data-label="expiry-date" data-value={expiryDate}>
          紹介期限: {formatDate(expiryDate)}
        </Item>
        <Item
          variant="list"
          data-label="working-hours"
          data-value={workingHours}
        >
          勤務時間: {workingHours}
        </Item>
        <Item
          variant="list"
          data-label="qualifications"
          data-value={qualifications || "nothing"}
        >
          必須資格: {qualifications || "nothing"}
        </Item>
      </ItemGroup>
    </article>
  );
}
