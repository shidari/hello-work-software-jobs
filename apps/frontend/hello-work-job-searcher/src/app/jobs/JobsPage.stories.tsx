import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import {
  mockJobs,
  setMockJobList,
  setMockJobs,
} from "@/lib/backend-client.mock";
import Page from "./page";

const meta = {
  title: "Pages/JobsPage",
  component: Page,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/jobs" },
    },
  },
  async beforeEach() {
    setMockJobs(mockJobs);
    setMockJobList({
      jobs: mockJobs.slice(0, 20),
      meta: {
        totalCount: mockJobs.length,
        page: 1,
        totalPages: Math.ceil(mockJobs.length / 20),
      },
    });
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    searchParams: Promise.resolve({}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("求人情報一覧")).toBeInTheDocument();
    await expect(canvas.getByText(/25 件/)).toBeInTheDocument();
    await expect(
      canvas.getAllByText(mockJobs[0].occupation).length,
    ).toBeGreaterThan(0);
  },
};

export const Page2: Story = {
  async beforeEach() {
    setMockJobs(mockJobs);
    setMockJobList({
      jobs: mockJobs.slice(20),
      meta: {
        totalCount: mockJobs.length,
        page: 2,
        totalPages: Math.ceil(mockJobs.length / 20),
      },
    });
  },
  args: {
    searchParams: Promise.resolve({ page: "2" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("求人情報一覧")).toBeInTheDocument();
    await expect(canvas.getByText(/25 件/)).toBeInTheDocument();
  },
};

export const Empty: Story = {
  async beforeEach() {
    setMockJobList({
      jobs: [],
      meta: { totalCount: 0, page: 1, totalPages: 0 },
    });
  },
  args: {
    searchParams: Promise.resolve({}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("求人情報一覧")).toBeInTheDocument();
    await expect(canvas.getByText(/0 件/)).toBeInTheDocument();
  },
};
