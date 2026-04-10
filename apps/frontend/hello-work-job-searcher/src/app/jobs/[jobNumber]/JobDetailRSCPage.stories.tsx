import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { mockJobs, setMockJobs } from "@/lib/backend-client.mock";
import Page from "./page";

const meta = {
  title: "Pages/JobDetailRSCPage",
  component: Page,
  async beforeEach() {
    setMockJobs(mockJobs);
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    params: Promise.resolve({ jobNumber: mockJobs[0].jobNumber }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(mockJobs[0].occupation)).toBeInTheDocument();
    await expect(canvas.getByText(/求人一覧に戻る/)).toBeInTheDocument();
  },
};

export const NotFound: Story = {
  args: {
    params: Promise.resolve({ jobNumber: "99999-00000000" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("求人が見つかりませんでした。"),
    ).toBeInTheDocument();
  },
};
