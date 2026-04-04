import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "TypeScript" },
};

export const Secondary: Story = {
  args: { children: "Draft", variant: "secondary" },
};

export const Outline: Story = {
  args: { children: "v1.0.0", variant: "outline" },
};

export const Group: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Badge>正社員</Badge>
      <Badge variant="secondary">パート</Badge>
      <Badge variant="outline">契約社員</Badge>
    </div>
  ),
};
