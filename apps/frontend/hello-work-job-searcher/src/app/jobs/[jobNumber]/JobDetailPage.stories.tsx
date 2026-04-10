import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { mockJobs } from "@/lib/backend-client.mock";
import { JobDetailPage } from "./JobDetailPage_client";

const meta = {
  title: "Pages/JobDetailPage",
  component: JobDetailPage,
} satisfies Meta<typeof JobDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    job: mockJobs[0],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(mockJobs[0].occupation)).toBeInTheDocument();
    await expect(
      canvas.getByText(mockJobs[0].companyName ?? ""),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/求人一覧に戻る/)).toBeInTheDocument();
  },
};

export const AnotherJob: Story = {
  args: {
    job: mockJobs[4],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(mockJobs[4].occupation)).toBeInTheDocument();
  },
};
