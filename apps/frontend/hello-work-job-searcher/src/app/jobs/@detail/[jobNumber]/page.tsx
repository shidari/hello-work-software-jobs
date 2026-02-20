import { Job } from "@sho/models";
import { Schema } from "effect";
import { JobDetail } from "@/components/features/JobDetail/JobDetail";

const jobFetchSuccessResponseSchema = Schema.Struct({
  ...Job.fields,
  status: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

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
  const validatedData = Schema.decodeUnknownSync(jobFetchSuccessResponseSchema)(
    data,
  );
  const jobDetail = {
    ...validatedData,
    companyName: validatedData.companyName ?? "未記載",
    workingHours: `${validatedData.workingHours.start}〜${validatedData.workingHours.end}`,
    jobTitle: validatedData.occupation,
    salary: `${validatedData.wage.min}円〜${validatedData.wage.max}円`,
    workPlace: validatedData.workPlace ?? "未記載",
    jobDescription: validatedData.jobDescription ?? "未記載",
    qualifications: validatedData.qualifications ?? "未記載",
  };

  return <JobDetail jobDetail={jobDetail} />;
}
