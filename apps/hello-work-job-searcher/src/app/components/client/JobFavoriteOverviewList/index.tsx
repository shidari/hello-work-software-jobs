"use client";
import { JobOverviewSchema } from "@sho/models";
import * as v from "valibot";
import { useAtomValue, useSetAtom } from "jotai";
import Link from "next/link";
import { useEffect } from "react";
import { JobOverview } from "@/app/components/Job";
import { favoriteJobsAtom, removeFavoriteJobAtom } from "../atom";
import styles from "./index.module.css";

export function FavoriteJobOverviewList() {
  const items = useAtomValue(favoriteJobsAtom);
  const removeFavorite = useSetAtom(removeFavoriteJobAtom);
  const setFavoriteJobs = useSetAtom(favoriteJobsAtom);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("favoriteJobs");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const validated = parsed.map((item) => v.parse(JobOverviewSchema, item));
      setFavoriteJobs(validated);
    } catch {
      // ignore
    }
  }, [setFavoriteJobs]);

  return (
    <div className={styles.favoriteList}>
      {items.map((item) => (
        <section
          key={item.jobNumber}
          className={`${styles.jobOverview} ${styles.jobOverviewRelative}`}
        >
          <div className={styles.sectionHeader}>
            <Link href={`/jobs/${item.jobNumber}`} className={styles.jobLink}>
              <JobOverview
                jobNumber={item.jobNumber}
                companyName={item.companyName}
                jobTitle={item.jobTitle}
                employmentType={item.employmentType}
                workPlace={item.workPlace}
                employeeCount={item.employeeCount}
                receivedDate={item.receivedDate}
              />
            </Link>
          </div>
          <button
            className={styles.removeButton}
            onClick={() => removeFavorite(item.jobNumber)}
            type="button"
          >
            お気に入り解除
          </button>
        </section>
      ))}
    </div>
  );
}
