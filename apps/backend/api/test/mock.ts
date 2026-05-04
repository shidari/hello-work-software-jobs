import { Company as CompanySchema, Job as JobSchema } from "@sho/models";
import { Arbitrary } from "effect";
import * as fc from "effect/FastCheck";

export const sampleJobs = ({ num }: { num: number }) =>
  fc.sample(Arbitrary.make(JobSchema), num);

export const sampleCompanies = ({ num }: { num: number }) =>
  fc.sample(Arbitrary.make(CompanySchema), num);
