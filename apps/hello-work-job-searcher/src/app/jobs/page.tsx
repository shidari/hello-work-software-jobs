export const dynamic = "force-dynamic";

import type { TJobDetail } from "@sho/models";
import { Accordion } from "../_components/client/Accordion";
import { HydratedJob } from "../_components/client/HydratedJob";
import {
  HydratedJobOverviewList,
} from "../_components/client/JobOverViewList";
import { JobsSearchfilter } from "../_components/client/JobsSearchfilter/index";
import { JobtotalCount } from "../_components/client/JobTotalCount";
import { jobStoreClientOnServer } from "../_store/server";
import styles from "./page.module.css";

export default async function Page() {
  // 一旦対応めんどいからunsafeUnwrapを使う
  const result = await jobStoreClientOnServer.getInitialJobs();
  if (result.isErr()) {
    // エラーハンドリング
    console.error(result.error);
    return <div>求人情報の取得に失敗しました。</div>;
  }
  const data = result.value;
  const initialJobData: TJobDetail = {
    jobNumber: data.jobs[0]?.jobNumber ?? "",
    companyName: data.jobs[0]?.companyName ?? "",
    jobTitle: data.jobs[0]?.occupation ?? "",
    employmentType: data.jobs[0]?.employmentType ?? "",
    salary: `${data.jobs[0]?.wageMin ?? ""} - ${data.jobs[0]?.wageMax ?? ""}`,
    workPlace: data.jobs[0]?.workPlace ?? "不明",
    jobDescription: data.jobs[0]?.jobDescription ?? "",
    expiryDate: data.jobs[0]?.expiryDate ?? "",
    workingHours: `${data.jobs[0]?.workingStartTime ?? ""} - ${data.jobs[0]?.workingEndTime ?? ""}`,
    qualifications: data.jobs[0]?.qualifications ?? "",
    employeeCount: data.jobs[0]?.employeeCount ?? Number.NaN,
    receivedDate: data.jobs[0]?.receivedDate ?? "",
  }
  return (
    <div className={styles.mainSection}>
      <div className={styles.splitLayoutContainer}>
        <div className={styles.searchLayoutContainer}>
          <div className={styles.searchLayoutHeaderSection}>
            <h1>求人情報一覧</h1>
            <JobtotalCount initialDataFromServer={data.meta.totalCount} />
            <Accordion title="絞り込み">
              <JobsSearchfilter />
            </Accordion>
          </div>
          <div className={styles.searchLayoutListSection}>
            <HydratedJobOverviewList
              initialDataFromServer={{
                jobs: data.jobs,
                nextToken: data.nextToken,
                totalCount: data.meta.totalCount,
              }}
            />
          </div>
        </div>
        <div className={styles.jobDetailLayoutContainer}>
          <HydratedJob initialDataFromServer={initialJobData} />
        </div>
      </div>
    </div>
  );
}
