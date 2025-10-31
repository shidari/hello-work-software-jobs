"use client";
import type { TJobOverview } from "@sho/models";
import { useAtomValue, useSetAtom } from "jotai";
import {
  appendFavoriteJobAtom,
  favoriteJobsAtom,
  removeFavoriteJobAtom,
} from "../../../_atom";
import styles from "./useJobsWithFavoriteButton.module.css";

export function useJobsWithFavorite(items: TJobOverview[]) {
  const favoriteJobs = useAtomValue(favoriteJobsAtom);
  const appendFavoriteJob = useSetAtom(appendFavoriteJobAtom);
  const removeFavoriteJob = useSetAtom(removeFavoriteJobAtom);

  return items.map((item) => {
    const isFavorite = !!favoriteJobs.find(
      (job) => job.jobNumber === item.jobNumber,
    );
    const toggleFavorite = () => {
      if (isFavorite) {
        removeFavoriteJob(item.jobNumber);
      } else {
        appendFavoriteJob(item);
      }
    };
    return {
      item,
      JobFavoriteButton: () => (
        <JobFavoriteButton
          key={item.jobNumber}
          isFavorite={isFavorite}
          onClick={toggleFavorite}
        />
      ),
    };
  });
}

const JobFavoriteButton = ({
  isFavorite,
  onClick,
}: {
  isFavorite: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.favoriteButton} ${isFavorite ? styles.isFavorite : ""}`}
      aria-label={isFavorite ? "お気に入り解除" : "お気に入り"}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={isFavorite ? "#e0245e" : "none"}
        stroke={isFavorite ? "#e0245e" : "#bbb"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: "block", transition: "fill 0.2s, stroke 0.2s" }}
      >
        <title>{isFavorite ? "お気に入り解除" : "お気に入り"}</title>
        <path d="M12 21s-5.2-4.6-7.2-7.1C2.2 11.1 2 8.5 4 6.7c1.6-1.5 4.1-1.2 5.4.4L12 8.6l2.6-1.5c1.3-1.6 3.8-1.9 5.4-.4 2 1.8 1.8 4.4-.8 7.2C17.2 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
};
