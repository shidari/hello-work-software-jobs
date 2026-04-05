import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Provider } from "jotai";
import { JobCard } from "./JobCard";

const meta = {
  title: "Features/JobCard",
  component: JobCard,
  decorators: [
    (Story) => (
      <Provider>
        <Story />
      </Provider>
    ),
  ],
} satisfies Meta<typeof JobCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    job: {
      jobNumber: "13080-12345678",
      companyName: "株式会社サンプル",
      occupation: "ソフトウェア開発技術者",
      employmentType: "正社員",
      workPlace: "東京都渋谷区",
      employeeCount: 150,
      receivedDate: "2026-04-01",
    },
  },
};

export const New: Story = {
  args: {
    job: {
      jobNumber: "27010-87654321",
      companyName: "合同会社テスト",
      occupation: "プログラマー",
      employmentType: "契約社員",
      workPlace: "大阪府大阪市",
      employeeCount: 30,
      receivedDate: new Date().toISOString().slice(0, 10),
    },
    isNew: true,
  },
};

export const MissingFields: Story = {
  args: {
    job: {
      jobNumber: "13080-99999999",
      companyName: null,
      occupation: "一般事務",
      employmentType: "パート",
      workPlace: null,
      employeeCount: null,
      receivedDate: "2026-03-15",
    },
  },
};
