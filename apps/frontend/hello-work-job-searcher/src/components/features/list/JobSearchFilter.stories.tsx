import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { JobSearchFilter } from "./JobSearchFilter";

const meta = {
  title: "Features/JobSearchFilter",
  component: JobSearchFilter,
} satisfies Meta<typeof JobSearchFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    defaultValue: {},
    onSubmit: fn(),
  },
};

export const WithDefaults: Story = {
  args: {
    defaultValue: {
      companyName: "サンプル",
      employmentType: "正社員",
      workPlace: "東京都",
      orderByReceiveDate: "desc",
      onlyNotExpired: "true",
    },
    onSubmit: fn(),
  },
};
