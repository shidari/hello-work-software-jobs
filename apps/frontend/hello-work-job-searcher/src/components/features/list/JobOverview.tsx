import { Job } from "@sho/models";

export const JobOverviewSchema = Job.pick(
  "jobNumber",
  "companyName",
  "occupation",
  "employmentType",
  "workPlace",
  "employeeCount",
  "receivedDate",
);
export type JobOverview = typeof JobOverviewSchema.Type;

export function JobOverview(props: JobOverview) {
  const { companyName, occupation, employmentType, workPlace, employeeCount } =
    props;
  return (
    <div>
      <h2 data-label="company_name">{companyName}</h2>
      <ul>
        <li data-label="occupation">職種: {occupation}</li>
        <li data-label="employment-type">求人区分: {employmentType}</li>
        <li data-label="work-place">就業場所: {workPlace ?? "未記載"}</li>
        <li data-label="employee-count">従業員数: {employeeCount}人</li>
      </ul>
    </div>
  );
}
