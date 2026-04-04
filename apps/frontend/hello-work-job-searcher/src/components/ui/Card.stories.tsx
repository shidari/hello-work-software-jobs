import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, CardGroup } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Card content" },
};

export const WithContent: Story = {
  render: () => (
    <Card>
      <h3 style={{ margin: "0 0 0.5rem" }}>Title</h3>
      <p style={{ margin: 0, color: "#656d76" }}>Some description text here.</p>
    </Card>
  ),
};

export const Group: Story = {
  render: () => (
    <CardGroup>
      <Card>Card 1</Card>
      <Card>Card 2</Card>
      <Card>Card 3</Card>
    </CardGroup>
  ),
};
