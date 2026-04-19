"use client";

import type { hc, InferResponseType } from "hono/client";
import Link from "next/link";
import { Label } from "@/components/ui/Label";
import type { AppType } from "@/lib/backend-client";
import styles from "./CompanyDetailPage.module.css";

type Client = ReturnType<typeof hc<AppType>>;
export type CompanyResponse = InferResponseType<
  Client["companies"][":establishmentNumber"]["$get"],
  200
>;
export type CompanyJobsResponse = InferResponseType<
  Client["jobs"]["$get"],
  200
>;

export function CompanyDetailPage({
  company,
  jobs,
}: {
  company: CompanyResponse;
  jobs: CompanyJobsResponse["jobs"];
}) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/jobs" className={styles.backLink}>
          &larr; 求人一覧に戻る
        </Link>
      </div>
      <article className={styles.article}>
        <h2 className={styles.title}>
          {company.companyName ?? "事業所"}
          <span className={styles.subtitle}>
            事業所番号: {company.establishmentNumber}
          </span>
        </h2>
        <div className={styles.labels}>
          <Label term="会社名">{company.companyName ?? "未記載"}</Label>
          <Label term="郵便番号">{company.postalCode ?? "未記載"}</Label>
          <Label term="所在地">{company.address ?? "未記載"}</Label>
          <Label term="従業員数">
            {company.employeeCount != null
              ? `${company.employeeCount}人`
              : "未記載"}
          </Label>
          <Label term="設立年">{company.foundedYear ?? "未記載"}</Label>
          <Label term="資本金">{company.capital ?? "未記載"}</Label>
          <Label term="事業内容">
            {company.businessDescription ?? "未記載"}
          </Label>
          <Label term="法人番号">{company.corporateNumber ?? "未記載"}</Label>
        </div>

        <h3 className={styles.jobsHeading}>
          この事業所の求人（{jobs.length}件）
        </h3>
        {jobs.length === 0 ? (
          <p className={styles.empty}>掲載中の求人はありません。</p>
        ) : (
          <ul className={styles.jobs}>
            {jobs.map((j) => (
              <li key={j.jobNumber} className={styles.jobItem}>
                <Link href={`/jobs/${j.jobNumber}`} className={styles.jobLink}>
                  <span className={styles.jobOccupation}>{j.occupation}</span>
                  <span className={styles.jobMeta}>
                    {j.employmentType}
                    {j.workPlace ? ` ・ ${j.workPlace}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
