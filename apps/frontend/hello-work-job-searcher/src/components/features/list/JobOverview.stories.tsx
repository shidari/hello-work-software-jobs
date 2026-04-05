import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { JobOverviewSummary } from "./JobOverview";

const meta = {
  title: "Features/JobOverviewSummary",
  component: JobOverviewSummary,
} satisfies Meta<typeof JobOverviewSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    jobNumber: "13080-12345678",
    companyName: "株式会社サンプル",
    occupation: "ソフトウェア開発技術者",
    employmentType: "正社員",
    workPlace: "東京都渋谷区",
    employeeCount: 150,
    receivedDate: "2026-04-01",
  },
};

export const MissingFields: Story = {
  args: {
    jobNumber: "13080-99999999",
    companyName: null,
    occupation: "プログラマー",
    employmentType: "契約社員",
    workPlace: null,
    employeeCount: null,
    receivedDate: "2026-03-15",
  },
};
