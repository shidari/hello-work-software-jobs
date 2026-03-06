"use client";

import { ClientJobDetail } from "@/components/features/detail/ClientJobDetail";
import { JobOverviewList } from "@/components/features/list/JobOverviewList";
import { JobsSearchfilter } from "@/components/features/list/JobSearchFilter";
import { JobtotalCount } from "@/components/features/list/JobTotalCount";
import { Collapsible } from "@/components/ui/Collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/Sidebar";
import styles from "./JobsPageClient.module.css";

function JobsPageContent({ initialTotalCount }: { initialTotalCount: number }) {
  const { isMobile, setOpen } = useSidebar();

  const handleJobSelect = () => {
    if (isMobile) setOpen(false);
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <h1 className={styles.title}>求人情報一覧</h1>
          <div className={styles.totalCount}>
            <JobtotalCount initialDataFromServer={initialTotalCount} />
          </div>
          <Collapsible title="絞り込み">
            <JobsSearchfilter />
          </Collapsible>
        </SidebarHeader>
        <SidebarContent>
          <JobOverviewList onJobSelect={handleJobSelect} />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className={styles.mainHeader}>
          <SidebarTrigger />
        </div>
        <div className={styles.mainContent}>
          <ClientJobDetail />
        </div>
      </SidebarInset>
    </>
  );
}

export function JobsPageClient({
  initialTotalCount,
}: {
  initialTotalCount: number;
}) {
  return (
    <SidebarProvider>
      <div className={styles.container}>
        <JobsPageContent initialTotalCount={initialTotalCount} />
      </div>
    </SidebarProvider>
  );
}
