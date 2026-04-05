"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import type { JobOverview } from "@/dto";
import { FavoriteButton } from "../favorites/FavoriteButton";
import styles from "./JobCard.module.css";

export function JobCard({ job, isNew }: { job: JobOverview; isNew?: boolean }) {
  const { companyName, occupation, employmentType, workPlace, employeeCount } =
    job;
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.companyName}>{companyName ?? "非公開"}</span>
        {isNew && <Badge className={styles.newBadge}>新着</Badge>}
      </div>
      <div className={styles.details}>
        <Label term="職種">{occupation}</Label>
        <Label term="求人区分">{employmentType}</Label>
        <Label term="就業場所">{workPlace ?? "未記載"}</Label>
        <Label term="従業員数">
          {employeeCount != null ? `${employeeCount}人` : "未記載"}
        </Label>
      </div>
      <FavoriteButton job={job} />
    </Card>
  );
}
