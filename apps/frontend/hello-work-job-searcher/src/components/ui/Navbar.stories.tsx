import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Navbar } from "./Navbar";

const meta = {
  title: "UI/Navbar",
  component: Navbar,
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    brand: "Hello Work 求人検索",
    items: [
      { label: "求人一覧", href: "/jobs" },
      { label: "お気に入り", href: "/favorites" },
    ],
  },
};
