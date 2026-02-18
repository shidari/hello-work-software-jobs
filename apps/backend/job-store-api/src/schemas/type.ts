import type { Job as DomainJob } from "@sho/models";
import type { InferOutput } from "valibot";
import type { JobListSchema, JobSchema, searchFilterSchema } from "./dbClient";
import type { insertJobRequestBodySchema } from "./endpoints/jobInsert";
import type { jobListQuerySchema } from "./endpoints/jobList";
import type { decodedNextTokenSchema } from "./endpoints/jobListContinue";

// --- コマンド型 ---
export type InsertJobCommand = {
	type: "InsertJob";
	payload: InsertJobRequestBody;
};
export type FindJobByNumberCommand = {
	type: "FindJobByNumber";
	jobNumber: string;
};
export type FetchJobsPageCommand = {
	type: "FetchJobsPage";
	options: {
		page: number;
		filter: SearchFilter;
	};
};
export type CheckJobExistsCommand = {
	type: "CheckJobExists";
	jobNumber: string;
};

export type CountJobsCommand = {
	type: "CountJobs";
	options: {
		page: number;
		filter: SearchFilter;
	};
};

export type JobStoreCommand =
	| InsertJobCommand
	| FindJobByNumberCommand
	| FetchJobsPageCommand
	| CheckJobExistsCommand
	| CountJobsCommand;

// --- コマンドtypeごとのoutput型マッピング ---
export type SearchFilter = InferOutput<typeof searchFilterSchema>;
export interface CommandOutputMap {
	InsertJob:
		| { success: true; jobNumber: string }
		| {
				success: false;
				reason: "unknown";
				error: Error;
				_tag: "InsertJobFailed";
			};
	FindJobByNumber:
		| { success: true; job: Job | null }
		| {
				success: false;
				reason: "unknown";
				error: Error;
				_tag: "FindJobByNumberFailed";
			};
	FetchJobsPage:
		| {
				success: true;
				jobs: Job[];
				meta: { totalCount: number; filter: SearchFilter; page: number };
			}
		| {
				success: false;
				reason: "unknown";
				error: Error;
				_tag: "FetchJobsPageFailed";
			};
	CheckJobExists:
		| { success: true; exists: boolean }
		| {
				success: false;
				reason: "unknown";
				error: Error;
				_tag: "CheckJobExistsFailed";
			};
	CountJobs:
		| { success: true; count: number }
		| {
				success: false;
				reason: "unknown";
				error: Error;
				_tag: "CountJobsFailed";
			};
}

// --- typeからoutput型を推論 ---
export type CommandOutput<T extends JobStoreCommand> = T extends {
	type: infer U;
}
	? U extends keyof CommandOutputMap
		? CommandOutputMap[U]
		: never
	: never;

// --- コマンドパターンなDBクライアント ---
export type JobStoreDBClient = {
	execute: <T extends JobStoreCommand>(cmd: T) => Promise<CommandOutput<T>>;
};

export type Job = InferOutput<typeof JobSchema>;

export type InsertJobRequestBody = InferOutput<
	typeof insertJobRequestBodySchema
>;

export type JobList = InferOutput<typeof JobListSchema>;

export type JobListQuery = InferOutput<typeof jobListQuerySchema>;

export type DecodedNextToken = InferOutput<typeof decodedNextTokenSchema>;
