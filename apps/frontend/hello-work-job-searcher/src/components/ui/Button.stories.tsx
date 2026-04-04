import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: "検索", variant: "primary" },
};

export const Outline: Story = {
  args: { children: "キャンセル", variant: "outline" },
};

export const Ghost: Story = {
  args: { children: "詳細を見る", variant: "ghost" },
};

export const Danger: Story = {
  args: { children: "削除", variant: "danger" },
};

export const Small: Story = {
  args: { children: "小さいボタン", size: "sm" },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};
