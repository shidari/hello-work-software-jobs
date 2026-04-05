import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Provider } from "jotai";
import { FavoriteButton } from "./FavoriteButton";

const meta = {
  title: "Features/FavoriteButton",
  component: FavoriteButton,
  decorators: [
    (Story) => (
      <Provider>
        <div style={{ position: "relative", width: 200, height: 60 }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
} satisfies Meta<typeof FavoriteButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleJob = {
  jobNumber: "13080-12345678",
  companyName: "株式会社サンプル",
  occupation: "ソフトウェア開発技術者",
  employmentType: "正社員",
  workPlace: "東京都渋谷区",
  employeeCount: 150,
  receivedDate: "2026-04-01",
};

export const Default: Story = {
  args: { job: sampleJob },
};
