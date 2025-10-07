import { jobFetchSuccessResponseSchema } from "@sho/models";
import * as v from "valibot";
import { JobDetail } from "@/app/_components/Job";

interface PageProps {
  params: Promise<{ jobNumber: string }>;
}

export default async function Page({ params }: PageProps) {
  const { jobNumber } = await params;

  const endpoint = process.env.JOB_STORE_ENDPOINT;
  if (!endpoint) {
    throw new Error("JOB_STORE_ENDPOINT is not defined");
  }
  const data = await fetch(`${endpoint}/jobs/${jobNumber}`).then((res) =>
    res.json(),
  );
  const validatedData = v.parse(jobFetchSuccessResponseSchema, data);
  const jobDetail = {
    ...validatedData,
    workingHours: `${validatedData.workingStartTime}〜${validatedData.workingEndTime}`,
    jobTitle: validatedData.occupation,
    salary: `${validatedData.wageMin}円〜${validatedData.wageMax}円`,
    workPlace: validatedData.workPlace ?? "未記載",
    jobDescription: validatedData.jobDescription ?? "未記載",
    qualifications: validatedData.qualifications ?? "未記載",
  };

  return (
    <JobDetail jobDetail={jobDetail} />
  );
}
