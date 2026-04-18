"use client";

import { Schema } from "effect";
import type { hc, InferRequestType } from "hono/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { AppType } from "@/lib/backend-client";
import styles from "./JobSearchFilter.module.css";
import {
  type SearchFilter,
  SearchFilterSchema,
} from "./JobSearchFilter.schema";

export { type SearchFilter, SearchFilterSchema };

type JobsQuery = InferRequestType<
  ReturnType<typeof hc<AppType>>["jobs"]["$get"]
>["query"];

type EmploymentTypeValue = NonNullable<JobsQuery["employmentType"]>;

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "正社員", label: "正社員" },
  { value: "パート労働者", label: "パート" },
  { value: "正社員以外", label: "正社員以外" },
  { value: "有期雇用派遣労働者", label: "派遣" },
] as const satisfies readonly {
  value: EmploymentTypeValue | "";
  label: string;
}[];

export function JobSearchFilter({
  defaultValue,
  onSubmit,
}: {
  defaultValue: SearchFilter;
  onSubmit: (filter: SearchFilter) => void;
}) {
  const action = (formData: FormData) => {
    let employeeCountGt: string | undefined;
    let employeeCountLt: string | undefined;
    switch (formData.get("employeeCountRange")) {
      case "1-9":
        employeeCountGt = "0";
        employeeCountLt = "10";
        break;
      case "10-30":
        employeeCountGt = "9";
        employeeCountLt = "31";
        break;
      case "30-100":
        employeeCountGt = "29";
        employeeCountLt = "101";
        break;
      case "100+":
        employeeCountGt = "100";
        break;
    }

    const raw = Object.fromEntries(
      [...formData.entries()].filter(([, v]) => v !== ""),
    );

    const parsed = Schema.decodeUnknownSync(SearchFilterSchema)({
      ...raw,
      onlyNotExpired: raw.onlyNotExpired === "on" ? "true" : undefined,
      employeeCountGt,
      employeeCountLt,
    });

    onSubmit(parsed);
  };

  const defaultRange = (() => {
    switch (
      `${defaultValue.employeeCountGt ?? ""},${defaultValue.employeeCountLt ?? ""}`
    ) {
      case "0,10":
        return "1-9";
      case "9,31":
        return "10-30";
      case "29,101":
        return "30-100";
      case "100,":
        return "100+";
      default:
        return "";
    }
  })();

  return (
    <form action={action} className={styles.formGrid}>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>検索</span>
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>会社名</span>
          <Input
            type="text"
            placeholder="会社名で検索"
            name="companyName"
            aria-label="会社名"
            defaultValue={defaultValue.companyName ?? ""}
          />
        </div>
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>求人内容（キーワード）</span>
          <Input
            type="text"
            placeholder="キーワードを入力"
            name="jobDescription"
            aria-label="求人内容キーワード"
            defaultValue={defaultValue.jobDescription ?? ""}
          />
        </div>
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>除外キーワード</span>
          <Input
            type="text"
            placeholder="除外するキーワードを入力"
            name="jobDescriptionExclude"
            aria-label="除外キーワード"
            defaultValue={defaultValue.jobDescriptionExclude ?? ""}
          />
        </div>
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>職種</span>
          <Input
            type="text"
            placeholder="職種で検索"
            name="occupation"
            aria-label="職種"
            defaultValue={defaultValue.occupation ?? ""}
          />
        </div>
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>勤務地</span>
          <Input
            type="text"
            placeholder="勤務地で検索"
            name="workPlace"
            aria-label="勤務地"
            defaultValue={defaultValue.workPlace ?? ""}
          />
        </div>
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>資格・経験</span>
          <Input
            type="text"
            placeholder="必要な資格・経験で検索"
            name="qualifications"
            aria-label="資格・経験"
            defaultValue={defaultValue.qualifications ?? ""}
          />
        </div>
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>絞り込み</span>
        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>雇用形態</span>
            <Select
              name="employmentType"
              aria-label="雇用形態"
              defaultValue={defaultValue.employmentType ?? ""}
            >
              {EMPLOYMENT_TYPE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>従業員数</span>
            <Select
              name="employeeCountRange"
              aria-label="従業員数"
              defaultValue={defaultRange}
            >
              <option value="">すべて</option>
              <option value="1-9">1~9人</option>
              <option value="10-30">10~30人</option>
              <option value="30-100">30~100人</option>
              <option value="100+">100人以上</option>
            </Select>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>賃金（下限）</span>
            <Input
              type="number"
              placeholder="最低賃金"
              name="wageMin"
              aria-label="賃金下限"
              defaultValue={defaultValue.wageMin ?? ""}
            />
          </div>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>賃金（上限）</span>
            <Input
              type="number"
              placeholder="最高賃金"
              name="wageMax"
              aria-label="賃金上限"
              defaultValue={defaultValue.wageMax ?? ""}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>受付日ソート</span>
            <Select
              name="orderByReceiveDate"
              aria-label="受付日ソート"
              defaultValue={defaultValue.orderByReceiveDate ?? ""}
            >
              <option value="">デフォルト</option>
              <option value="desc">新しい順</option>
              <option value="asc">古い順</option>
            </Select>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>追加日（から）</span>
            <Input
              type="date"
              name="addedSince"
              aria-label="追加日（から）"
              defaultValue={defaultValue.addedSince ?? ""}
            />
          </div>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>追加日（まで）</span>
            <Input
              type="date"
              name="addedUntil"
              aria-label="追加日（まで）"
              defaultValue={defaultValue.addedUntil ?? ""}
            />
          </div>
        </div>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="onlyNotExpired"
            defaultChecked={defaultValue.onlyNotExpired === "true"}
          />
          有効な求人のみ
        </label>
      </div>
      <Button type="submit">検索</Button>
    </form>
  );
}
