"use client";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import {
  initializeJobListWriterAtom,
  type SearchFilter,
  scrollRestorationByItemIndexAtom,
  scrollRestorationByItemListAtom,
  searchFilterAtom,
} from "@/atom";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import styles from "./JobSearchFilter.module.css";

function toEmployeeCountRange(filter: SearchFilter): string {
  const gt = filter.employeeCountGt;
  const lt = filter.employeeCountLt;
  if (gt === "0" && lt === "10") return "1-9";
  if (gt === "9" && lt === "31") return "10-30";
  if (gt === "29" && lt === "101") return "30-100";
  if (gt === "100" && lt === undefined) return "100+";
  return "";
}

export const JobsSearchfilter = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<number | null>(null);
  const initializeJobList = useSetAtom(initializeJobListWriterAtom);
  const jobListIndexSetter = useSetAtom(scrollRestorationByItemIndexAtom);
  const jobListItemSetter = useSetAtom(scrollRestorationByItemListAtom);
  const currentFilter = useAtomValue(searchFilterAtom);
  const router = useRouter();

  const resetRestoration = useCallback(() => {
    jobListIndexSetter(0);
    jobListItemSetter([]);
  }, [jobListIndexSetter, jobListItemSetter]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      if (formRef.current === null) return;
      const formData = new FormData(formRef.current);
      const companyName = formData.get("companyName");
      const jobDescription = formData.get("jobDescription");
      const jobDescriptionExclude = formData.get("jobDescriptionExclude");
      const employeeCountRange = formData.get("employeeCountRange");
      let employeeCountFilter: Record<string, number> = {};

      switch (employeeCountRange) {
        case "1-9":
          employeeCountFilter = { employeeCountGt: 0, employeeCountLt: 10 };
          break;
        case "10-30":
          employeeCountFilter = { employeeCountGt: 9, employeeCountLt: 31 };
          break;
        case "30-100":
          employeeCountFilter = { employeeCountGt: 29, employeeCountLt: 101 };
          break;
        case "100+":
          employeeCountFilter = { employeeCountGt: 100 };
          break;
        default:
          employeeCountFilter = {};
      }

      const addedSince = formData.get("addedSince");
      const addedUntil = formData.get("addedUntil");
      const orderByReceiveDate = formData.get("orderByReceiveDate");
      const onlyNotExpired = formData.get("onlyNotExpired") === "on";
      const occupation = formData.get("occupation");
      const employmentType = formData.get("employmentType");
      const wageMin = formData.get("wageMin");
      const wageMax = formData.get("wageMax");
      const workPlace = formData.get("workPlace");
      const qualifications = formData.get("qualifications");

      const searchFilter = {
        ...(typeof companyName === "string" && companyName
          ? { companyName }
          : {}),
        ...(typeof jobDescription === "string" && jobDescription
          ? { jobDescription }
          : {}),
        ...(typeof jobDescriptionExclude === "string" && jobDescriptionExclude
          ? { jobDescriptionExclude }
          : {}),
        ...employeeCountFilter,
        ...(typeof addedSince === "string" && addedSince ? { addedSince } : {}),
        ...(typeof addedUntil === "string" && addedUntil ? { addedUntil } : {}),
        ...(typeof orderByReceiveDate === "string" && orderByReceiveDate
          ? { orderByReceiveDate }
          : {}),
        ...(onlyNotExpired ? { onlyNotExpired: "true" } : {}),
        ...(typeof occupation === "string" && occupation ? { occupation } : {}),
        ...(typeof employmentType === "string" && employmentType
          ? { employmentType }
          : {}),
        ...(typeof wageMin === "string" && wageMin ? { wageMin } : {}),
        ...(typeof wageMax === "string" && wageMax ? { wageMax } : {}),
        ...(typeof workPlace === "string" && workPlace ? { workPlace } : {}),
        ...(typeof qualifications === "string" && qualifications
          ? { qualifications }
          : {}),
      };

      // URL クエリパラメータを更新
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(searchFilter)) {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      }
      const query = params.toString();
      router.replace(query ? `/jobs?${query}` : "/jobs", { scroll: false });

      initializeJobList(searchFilter);
      resetRestoration();
    }, 300);
  };

  const defaultRange = toEmployeeCountRange(currentFilter);

  return (
    <form ref={formRef} className={styles.formGrid}>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>検索</span>
        <div className={styles.fieldGroup}>
          <Label className={styles.fieldLabel}>会社名</Label>
          <Input
            type="text"
            placeholder="会社名で検索"
            name="companyName"
            aria-label="会社名"
            defaultValue={currentFilter.companyName ?? ""}
            onChange={handleChange}
          />
        </div>
        <div className={styles.fieldGroup}>
          <Label className={styles.fieldLabel}>求人内容（キーワード）</Label>
          <Input
            type="text"
            placeholder="キーワードを入力"
            name="jobDescription"
            aria-label="求人内容キーワード"
            defaultValue={currentFilter.jobDescription ?? ""}
            onChange={handleChange}
          />
        </div>
        <div className={styles.fieldGroup}>
          <Label className={styles.fieldLabel}>除外キーワード</Label>
          <Input
            type="text"
            placeholder="除外するキーワードを入力"
            name="jobDescriptionExclude"
            aria-label="除外キーワード"
            defaultValue={currentFilter.jobDescriptionExclude ?? ""}
            onChange={handleChange}
          />
        </div>
        <div className={styles.fieldGroup}>
          <Label className={styles.fieldLabel}>職種</Label>
          <Input
            type="text"
            placeholder="職種で検索"
            name="occupation"
            aria-label="職種"
            defaultValue={currentFilter.occupation ?? ""}
            onChange={handleChange}
          />
        </div>
        <div className={styles.fieldGroup}>
          <Label className={styles.fieldLabel}>勤務地</Label>
          <Input
            type="text"
            placeholder="勤務地で検索"
            name="workPlace"
            aria-label="勤務地"
            defaultValue={currentFilter.workPlace ?? ""}
            onChange={handleChange}
          />
        </div>
        <div className={styles.fieldGroup}>
          <Label className={styles.fieldLabel}>資格・経験</Label>
          <Input
            type="text"
            placeholder="必要な資格・経験で検索"
            name="qualifications"
            aria-label="資格・経験"
            defaultValue={currentFilter.qualifications ?? ""}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>絞り込み</span>
        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <Label className={styles.fieldLabel}>雇用形態</Label>
            <Select
              name="employmentType"
              aria-label="雇用形態"
              defaultValue={currentFilter.employmentType ?? ""}
              onChange={handleChange}
            >
              <option value="">すべて</option>
              <option value="正社員">正社員</option>
              <option value="パート">パート</option>
              <option value="契約社員">契約社員</option>
              <option value="派遣">派遣</option>
            </Select>
          </div>
          <div className={styles.fieldGroup}>
            <Label className={styles.fieldLabel}>従業員数</Label>
            <Select
              name="employeeCountRange"
              aria-label="従業員数"
              defaultValue={defaultRange}
              onChange={handleChange}
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
            <Label className={styles.fieldLabel}>賃金（下限）</Label>
            <Input
              type="number"
              placeholder="最低賃金"
              name="wageMin"
              aria-label="賃金下限"
              defaultValue={currentFilter.wageMin ?? ""}
              onChange={handleChange}
            />
          </div>
          <div className={styles.fieldGroup}>
            <Label className={styles.fieldLabel}>賃金（上限）</Label>
            <Input
              type="number"
              placeholder="最高賃金"
              name="wageMax"
              aria-label="賃金上限"
              defaultValue={currentFilter.wageMax ?? ""}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <Label className={styles.fieldLabel}>受付日ソート</Label>
            <Select
              name="orderByReceiveDate"
              aria-label="受付日ソート"
              defaultValue={currentFilter.orderByReceiveDate ?? ""}
              onChange={handleChange}
            >
              <option value="">デフォルト</option>
              <option value="desc">新しい順</option>
              <option value="asc">古い順</option>
            </Select>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <Label className={styles.fieldLabel}>追加日（から）</Label>
            <Input
              type="date"
              name="addedSince"
              aria-label="追加日（から）"
              defaultValue={currentFilter.addedSince ?? ""}
              onChange={handleChange}
            />
          </div>
          <div className={styles.fieldGroup}>
            <Label className={styles.fieldLabel}>追加日（まで）</Label>
            <Input
              type="date"
              name="addedUntil"
              aria-label="追加日（まで）"
              defaultValue={currentFilter.addedUntil ?? ""}
              onChange={handleChange}
            />
          </div>
        </div>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="onlyNotExpired"
            defaultChecked={currentFilter.onlyNotExpired === "true"}
            onChange={handleChange}
          />
          有効な求人のみ
        </label>
      </div>
    </form>
  );
};
