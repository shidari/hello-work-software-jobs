import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Select } from "./Select";

const meta = {
  title: "UI/Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select aria-label="雇用形態">
      <option value="">すべて</option>
      <option value="正社員">正社員</option>
      <option value="パート">パート</option>
      <option value="契約社員">契約社員</option>
      <option value="派遣">派遣</option>
    </Select>
  ),
};
