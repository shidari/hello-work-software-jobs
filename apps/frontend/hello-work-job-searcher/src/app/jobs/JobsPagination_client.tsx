"use client";

import { useRouter } from "next/navigation";
import { Pagination } from "@/components/ui/Pagination";

export function JobsPagination({
  currentPage,
  totalPages,
  filterParams,
}: {
  currentPage: number;
  totalPages: number;
  filterParams: URLSearchParams;
}) {
  const router = useRouter();

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={(page) => {
        const params = new URLSearchParams(filterParams);
        params.set("page", String(page));
        router.push(`/jobs?${params}`);
      }}
    />
  );
}
