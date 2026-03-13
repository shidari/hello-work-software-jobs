"use client";

import { useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { Suspense } from "react";
import { jobTotalCountSelector } from "@/atom/selectors";

function TotalCountValue() {
  const totalCount = useAtomValue(jobTotalCountSelector);
  return <span>{totalCount}</span>;
}

export const JobtotalCount = ({
  initialDataFromServer,
}: {
  initialDataFromServer: number;
}) => {
  useHydrateAtoms([[jobTotalCountSelector, initialDataFromServer]]);
  return (
    <div>
      求人情報の総数:
      <Suspense fallback={<span>...</span>}>
        <TotalCountValue />
      </Suspense>
      件
    </div>
  );
};
