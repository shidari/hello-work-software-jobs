"use client";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  initializeJobListWriterAtom,
  scrollRestorationByItemIndexAtom,
  scrollRestorationByItemListAtom,
} from "../../../_atom";
import styles from "./JobsSearchfilter.module.css";

export const JobsSearchfilter = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<number | null>(null); // 追加
  const initializeJobList = useSetAtom(initializeJobListWriterAtom);
  const jobListIndexSetter = useSetAtom(scrollRestorationByItemIndexAtom);
  const jobListItemSetter = useSetAtom(scrollRestorationByItemListAtom);

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
      };
      initializeJobList(searchFilter);
      resetRestoration();
    }, 300);
  };

  return (
    <form ref={formRef} className={styles.formGrid}>
      <input
        type="text"
        placeholder="会社名を検索"
        name="companyName"
        onChange={handleChange}
        className={styles.inputFull}
      />
      <input
        type="text"
        placeholder="求人内容をキーワード検索"
        name="jobDescription"
        onChange={handleChange}
        className={styles.inputFull}
      />
      <input
        type="text"
        placeholder="求人内容をキーワード除外検索"
        name="jobDescriptionExclude"
        onChange={handleChange}
        className={styles.inputFull}
      />
      <select
        name="employeeCountRange"
        defaultValue=""
        onChange={handleChange}
        className={styles.inputFull}
      >
        <option value="">従業員数で絞り込む</option>
        <option value="1-9">1~9人</option>
        <option value="10-30">10~30人</option>
        <option value="30-100">30~100人</option>
        <option value="100+">100人以上</option>
      </select>
    </form>
  );
};
