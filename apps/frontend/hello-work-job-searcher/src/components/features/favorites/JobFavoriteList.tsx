"use client";
import { Schema } from "effect";
import { useAtom, useAtomValue } from "jotai";
import Link from "next/link";
import { useEffect } from "react";
import { favoriteJobsAtom } from "@/atom/atoms";
import { favoriteRemoveWriter } from "@/atom/writers";
import { Card, CardGroup } from "@/components/ui/Card";
import { JobOverviewSchema } from "@/dto";
import styles from "./JobFavoriteList.module.css";
import { JobOverviewCard } from "./JobOverview";

export function FavoriteJobOverviewList() {
  const items = useAtomValue(favoriteJobsAtom);
  const [, removeFavorite] = useAtom(favoriteRemoveWriter);
  const [, setFavoriteJobs] = useAtom(favoriteJobsAtom);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("favoriteJobs");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const validated = parsed.map((item) =>
        Schema.decodeUnknownSync(JobOverviewSchema)(item),
      );
      setFavoriteJobs(validated);
    } catch {
      // ignore
    }
  }, [setFavoriteJobs]);

  return (
    <CardGroup>
      {items.map((item) => (
        <Card key={item.jobNumber} className={styles.favoriteCard}>
          <div className={styles.sectionHeader}>
            <Link
              href={`/jobs/${item.jobNumber}`}
              className={styles.cardLink}
            >
              <JobOverviewCard
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
