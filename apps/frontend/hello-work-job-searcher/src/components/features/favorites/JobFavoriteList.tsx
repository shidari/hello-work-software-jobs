"use client";
import { Schema } from "effect";
import { useAtomValue, useSetAtom } from "jotai";
import Link from "next/link";
import { useEffect } from "react";
import {
  favoriteJobsAtom,
  favoriteJobsSelector,
  favoriteRemoveWriter,
} from "@/atom";
import { JobOverviewSummary } from "@/components/features/list/JobOverview";
import { Card, CardGroup } from "@/components/ui/Card";
import { JobOverviewSchema } from "@/dto";
import styles from "./JobFavoriteList.module.css";

export function FavoriteJobOverviewList() {
  const items = useAtomValue(favoriteJobsSelector);
  const removeFavorite = useSetAtom(favoriteRemoveWriter);
  const setFavorites = useSetAtom(favoriteJobsAtom);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("favoriteJobs");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const validated = parsed.map((item) =>
        Schema.decodeUnknownSync(JobOverviewSchema)(item),
      );
      setFavorites(validated);
    } catch {
      // ignore
    }
  }, [setFavorites]);

  return (
    <CardGroup>
      {items.map((item) => (
        <Card key={item.jobNumber} className={styles.favoriteCard}>
          <div className={styles.sectionHeader}>
            <Link href={`/jobs/${item.jobNumber}`} className={styles.cardLink}>
              <JobOverviewSummary
                jobNumber={item.jobNumber}
                companyName={item.companyName}
                occupation={item.occupation}
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
        </Card>
      ))}
    </CardGroup>
  );
}
