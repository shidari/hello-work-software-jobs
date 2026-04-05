import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkPlaceMap } from "./WorkPlaceMap";

const meta = {
  title: "Features/WorkPlaceMap",
  component: WorkPlaceMap,
} satisfies Meta<typeof WorkPlaceMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    address: "東京都渋谷区神宮前1-1-1",
  },
};

export const Osaka: Story = {
  args: {
    address: "大阪府大阪市北区梅田1-1-1",
  },
};
