import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Collapsible } from "./Collapsible";

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultOpen: Story = {
  args: {
    title: "絞り込み",
    defaultOpen: true,
    children: "ここにフィルターコンテンツが入ります。",
  },
};

export const DefaultClosed: Story = {
  args: {
    title: "詳細設定",
    defaultOpen: false,
    children: "展開すると表示されるコンテンツです。",
  },
};
