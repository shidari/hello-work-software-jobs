"use client";

import { Activity, useCallback, useEffect, useState } from "react";
import { ClientJobDetail } from "@/components/features/detail/ClientJobDetail";
import { JobOverviewList } from "@/components/features/list/JobOverviewList";
import { JobsSearchfilter } from "@/components/features/list/JobSearchFilter";
import { JobtotalCount } from "@/components/features/list/JobTotalCount";
import { Collapsible } from "@/components/ui/Collapsible";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/Item";
import styles from "./JobsPageClient.module.css";

const MOBILE_BREAKPOINT = 768;

export function JobsPageClient({
  initialTotalCount,
}: {
  initialTotalCount: number;
}) {
  const [open, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches;
      setIsMobile(mobile);
      if (mobile) setOpen(false);
      else setOpen(true);
    };
    onChange(mql);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const toggleSidebar = useCallback(() => setOpen((prev) => !prev), []);
  const handleJobSelect = () => {
    if (isMobile) setOpen(false);
  };

  return (
    <div className={styles.container}>
      {isMobile && open && (
        <button
          type="button"
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-label="サイドバーを閉じる"
        />
      )}
      <Activity mode={open ? "visible" : "hidden"}>
        <aside className={`${styles.sidebar} ${isMobile ? styles.mobile : ""}`}>
          <ItemGroup className={styles.sidebarHeader}>
            <Item>
              <ItemContent>
                <ItemTitle>
                  <h1 className={styles.title}>求人情報一覧</h1>
                </ItemTitle>
              </ItemContent>
            </Item>
            <Item>
              <ItemContent>
                <JobtotalCount initialDataFromServer={initialTotalCount} />
              </ItemContent>
            </Item>
            <Item>
              <ItemContent>
                <Collapsible title="絞り込み">
                  <JobsSearchfilter />
                </Collapsible>
              </ItemContent>
            </Item>
          </ItemGroup>
          <div className={styles.sidebarContent}>
            <JobOverviewList onJobSelect={handleJobSelect} />
          </div>
        </aside>
      </Activity>
      <div className={styles.main}>
        <div className={styles.mainHeader}>
          <button
            type="button"
            className={styles.trigger}
            onClick={toggleSidebar}
            aria-label={open ? "サイドバーを閉じる" : "サイドバーを開く"}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
        </div>
        <div className={styles.mainContent}>
          <ClientJobDetail />
        </div>
      </div>
    </div>
  );
}
