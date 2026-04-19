import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Suspense } from "react";
import { expect, within } from "storybook/test";
import { mockJobs } from "@/lib/backend-client.mock";
import { JobsList, type JobsListData } from "./JobsList_client";
import { JobsListSkeleton } from "./JobsListSkeleton";

const listData: JobsListData = {
  jobs: mockJobs.slice(0, 5) as unknown as JobsListData["jobs"],
  meta: { totalCount: mockJobs.length, page: 1, totalPages: 2 },
};

const meta = {
  title: "Pages/JobsPage/JobsList",
  component: JobsList,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/jobs" },
    },
  },
  decorators: [
    (Story) => (
      <Suspense fallback={<JobsListSkeleton />}>
        <Story />
      </Suspense>
    ),
  ],
} satisfies Meta<typeof JobsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    jobsPromise: Promise.resolve(listData),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/25 件/)).toBeInTheDocument();
    await expect(
      canvas.getAllByText(mockJobs[0].occupation).length,
    ).toBeGreaterThan(0);
  },
};

export const LoadingState: Story = {
  name: "Loading (Suspense fallback)",
  args: {
    jobsPromise: new Promise<JobsListData>(() => {}),
  },
};
