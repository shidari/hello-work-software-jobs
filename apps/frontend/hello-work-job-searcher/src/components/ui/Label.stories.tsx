import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Label } from "./Label";

const meta = {
  title: "UI/Label",
  component: Label,
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { term: "企業名", children: "株式会社サンプル" },
};

export const Multiple: Story = {
  args: { term: "職種", children: "ソフトウェアエンジニア" },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Label term="職種">ソフトウェアエンジニア</Label>
      <Label term="雇用形態">正社員</Label>
      <Label term="勤務地">東京都渋谷区</Label>
      <Label term="賃金">300,000円〜500,000円</Label>
    </div>
  ),
};
