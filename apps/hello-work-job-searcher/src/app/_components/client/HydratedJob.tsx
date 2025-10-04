"use client"

import type { TJobDetail } from "@sho/models";
import { useHydrateAtoms } from "jotai/utils";
import { jobAtom } from "./atom";
import { useAtomValue } from "jotai";
import { JobDetail } from "../Job";

export function HydratedJob({
    initialDataFromServer,
}: {
    initialDataFromServer: TJobDetail;
}) {
    useHydrateAtoms([[jobAtom, initialDataFromServer]]);
    return <ClientJobDetail />;
}

export function ClientJobDetail() {
    const job = useAtomValue(jobAtom);
    if (!job) {
        return <div>求人情報が選択されていません。</div>;
    }
    return <JobDetail jobDetail={job} />;
}