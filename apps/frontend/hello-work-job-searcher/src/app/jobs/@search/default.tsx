export const dynamic = "force-dynamic";

import { HydratedJobOverviewList } from "@/components/features/list/JobOverviewList";
import { JobsSearchfilter } from "@/components/features/list/JobSearchFilter";
import { JobtotalCount } from "@/components/features/list/JobTotalCount";
import { Accordion } from "@/components/ui/Accordion";
import { jobStoreClientOnServer } from "@/job-store-fetcher";
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
  return (
    <div className={styles["layout-search"]}>
      <div className={styles["layout-search-header"]}>
        <h1
          className={`${styles["header-title"]} ${styles["header-title--primary"]}`}
        >
          求人情報一覧
        </h1>
        <JobtotalCount initialDataFromServer={data.meta.totalCount} />
        <Accordion title="絞り込み">
          <JobsSearchfilter />
        </Accordion>
      </div>

      <div className={styles["layout-search-list"]}>
        <HydratedJobOverviewList
          initialDataFromServer={{
            jobs: data.jobs,
            nextToken: data.nextToken,
            totalCount: data.meta.totalCount,
          }}
        />
      </div>
    </div>
  );
}
