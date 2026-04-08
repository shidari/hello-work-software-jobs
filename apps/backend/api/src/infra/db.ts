import { createDB, DbCompanyRowSchema, DbJobRowSchema } from "@sho/db";
import { RawCompany, RawJob } from "@sho/models/raw";
import { Context, Schema } from "effect";
import { D1Dialect } from "kysely-d1";

export class JobStoreDB extends Context.Tag("JobStoreDB")<
  JobStoreDB,
  ReturnType<typeof createDB>
>() {
  static main = (binding: D1Database) =>
    createDB(new D1Dialect({ database: binding }));
}

// RawJob（ネスト） → DbJobRowSchema（フラット）
// decode: ネスト→フラット（status/createdAt/updatedAt を自動生成）
// encode: フラット→ネスト（system フィールドは除去）
export const JobToJobTable = Schema.transform(RawJob, DbJobRowSchema, {
  strict: true,
  decode: (job) => {
    const now = new Date().toISOString();
    return {
      jobNumber: job.jobNumber,
      companyName: job.companyName,
      receivedDate: job.receivedDate,
      expiryDate: job.expiryDate,
      homePage: job.homePage,
      occupation: job.occupation,
      employmentType: job.employmentType,
      wageMin: job.wage?.min ?? null,
      wageMax: job.wage?.max ?? null,
      workingStartTime: job.workingHours?.start ?? null,
      workingEndTime: job.workingHours?.end ?? null,
      employeeCount: job.employeeCount,
      workPlace: job.workPlace,
      jobDescription: job.jobDescription,
      qualifications: job.qualifications,
      onlineApplicationAccepted:
        job.onlineApplicationAccepted != null
          ? job.onlineApplicationAccepted
            ? 1
            : 0
          : null,
      establishmentNumber: job.establishmentNumber,
      jobCategory: job.jobCategory,
      industryClassification: job.industryClassification,
      publicEmploymentOffice: job.publicEmploymentOffice,
      dispatchType: job.dispatchType,
      employmentPeriod: job.employmentPeriod,
      ageRequirement: job.ageRequirement,
      education: job.education,
      requiredExperience: job.requiredExperience,
      trialPeriod: job.trialPeriod,
      carCommute: job.carCommute,
      transferPossibility: job.transferPossibility,
      wageType: job.wageType,
      raise: job.raise,
      bonus: job.bonus,
      insurance: job.insurance,
      retirementBenefit: job.retirementBenefit,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
  },
  encode: (row) => ({
    jobNumber: row.jobNumber,
    companyName: row.companyName,
    receivedDate: row.receivedDate,
    expiryDate: row.expiryDate,
    homePage: row.homePage,
    occupation: row.occupation,
    employmentType: row.employmentType,
    wage:
      row.wageMin != null && row.wageMax != null
        ? { min: row.wageMin, max: row.wageMax }
        : null,
    workingHours:
      row.workingStartTime != null || row.workingEndTime != null
        ? { start: row.workingStartTime, end: row.workingEndTime }
        : null,
    employeeCount: row.employeeCount,
    workPlace: row.workPlace,
    jobDescription: row.jobDescription,
    qualifications: row.qualifications,
    onlineApplicationAccepted:
      row.onlineApplicationAccepted != null
        ? row.onlineApplicationAccepted === 1
        : null,
    establishmentNumber: row.establishmentNumber,
    jobCategory: row.jobCategory,
    industryClassification: row.industryClassification,
    publicEmploymentOffice: row.publicEmploymentOffice,
    dispatchType: row.dispatchType,
    employmentPeriod: row.employmentPeriod,
    ageRequirement: row.ageRequirement,
    education: row.education,
    requiredExperience: row.requiredExperience,
    trialPeriod: row.trialPeriod,
    carCommute: row.carCommute,
    transferPossibility: row.transferPossibility,
    wageType: row.wageType,
    raise: row.raise,
    bonus: row.bonus,
    insurance: row.insurance,
    retirementBenefit: row.retirementBenefit,
  }),
});

// RawCompany → DbCompanyRowSchema
export const CompanyToCompanyTable = Schema.transform(
  RawCompany,
  DbCompanyRowSchema,
  {
    strict: true,
    decode: (row) => {
      const now = new Date().toISOString();
      return { ...row, createdAt: now, updatedAt: now };
    },
    encode: ({ createdAt: _, updatedAt: _u, ...rest }) => rest,
  },
);

export type DbJob = typeof RawJob.Type;
export type DbCompany = typeof RawCompany.Type;
