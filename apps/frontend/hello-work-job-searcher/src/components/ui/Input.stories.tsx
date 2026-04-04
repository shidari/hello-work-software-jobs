import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./Input";

const meta = {
  title: "UI/Input",
  component: Input,
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "キーワードを入力..." },
};

export const WithValue: Story = {
  args: { defaultValue: "東京都", type: "text" },
};

export const Invalid: Story = {
  args: { placeholder: "必須項目です", invalid: true },
};
