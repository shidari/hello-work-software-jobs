"use client";

import { useRouter } from "next/navigation";
import {
  JobSearchFilter,
  type SearchFilter,
} from "@/components/features/list/JobSearchFilter";

export function SearchFilterForm({
  defaultValue,
}: {
  defaultValue: SearchFilter;
}) {
  const router = useRouter();

  return (
    <JobSearchFilter
      defaultValue={defaultValue}
      onSubmit={(filter) => {
        const params = new URLSearchParams();
        if (filter.companyName) params.set("companyName", filter.companyName);
        if (filter.jobDescription)
          params.set("jobDescription", filter.jobDescription);
        if (filter.jobDescriptionExclude)
          params.set("jobDescriptionExclude", filter.jobDescriptionExclude);
        if (filter.occupation) params.set("occupation", filter.occupation);
        if (filter.workPlace) params.set("workPlace", filter.workPlace);
        if (filter.qualifications)
          params.set("qualifications", filter.qualifications);
        if (filter.employmentType)
          params.set("employmentType", filter.employmentType);
        if (filter.wageMin) params.set("wageMin", filter.wageMin);
        if (filter.wageMax) params.set("wageMax", filter.wageMax);
        if (filter.addedSince) params.set("addedSince", filter.addedSince);
        if (filter.addedUntil) params.set("addedUntil", filter.addedUntil);
        if (filter.orderByReceiveDate)
          params.set("orderByReceiveDate", filter.orderByReceiveDate);
        if (filter.onlyNotExpired)
          params.set("onlyNotExpired", filter.onlyNotExpired);
        if (filter.employeeCountGt)
          params.set("employeeCountGt", filter.employeeCountGt);
        if (filter.employeeCountLt)
          params.set("employeeCountLt", filter.employeeCountLt);
        const query = params.toString();
        router.push(query ? `/jobs?${query}` : "/jobs");
      }}
    />
  );
}
