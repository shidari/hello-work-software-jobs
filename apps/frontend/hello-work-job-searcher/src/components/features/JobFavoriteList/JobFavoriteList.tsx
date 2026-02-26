"use client";
import { Schema } from "effect";
import { useAtomValue, useSetAtom } from "jotai";
import Link from "next/link";
import { useEffect } from "react";
import { favoriteJobsAtom, removeFavoriteJobAtom } from "@/atom";
import {
  JobOverview,
  JobOverviewSchema,
} from "@/components/features/JobDetail/JobDetail";
import { Item } from "@/components/ui/Item";
import { ItemGroup } from "@/components/ui/ItemGroup";
import cardStyles from "../jobCard.module.css";
import styles from "./JobFavoriteList.module.css";

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
      const validated = parsed.map((item) =>
        Schema.decodeUnknownSync(JobOverviewSchema)(item),
      );
      setFavoriteJobs(validated);
    } catch {
      // ignore
    }
  }, [setFavoriteJobs]);

  return (
    <ItemGroup>
      {items.map((item) => (
        <Item key={item.jobNumber} className={styles.favoriteCard}>
          <div className={styles.sectionHeader}>
            <Link
              href={`/jobs/${item.jobNumber}`}
              className={cardStyles.cardLink}
            >
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
        </Item>
      ))}
    </ItemGroup>
  );
}
