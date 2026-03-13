"use client";

import { useAtomValue } from "jotai";
import { jobAtom } from "@/atom";
import styles from "./ClientJobDetail.module.css";
import { JobDetailCard } from "./JobDetail";

export function ClientJobDetail() {
  const job = useAtomValue(jobAtom);
  if (!job) {
    return (
      <div className={styles.empty}>
        <p>求人を選択してください</p>
      </div>
    );
  }
  return <JobDetailCard jobDetail={job} />;
}
