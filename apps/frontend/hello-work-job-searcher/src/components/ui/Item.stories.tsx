import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "./Item";

const meta = {
  title: "UI/Item",
  component: Item,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Item>
      <ItemContent>
        <ItemTitle>ソフトウェアエンジニア</ItemTitle>
        <ItemDescription>
          Webアプリケーションの開発・運用を担当していただきます。
        </ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const Outline: Story = {
  render: () => (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>企業名</ItemTitle>
        <ItemDescription>株式会社サンプル</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const Muted: Story = {
  render: () => (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>No media example</ItemTitle>
        <ItemDescription>Item without media slot</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>フロントエンドエンジニア</ItemTitle>
        <ItemDescription>React/TypeScriptを用いた開発</ItemDescription>
        <ItemFooter>
          <Badge>正社員</Badge>
          <Badge variant="secondary">東京都</Badge>
        </ItemFooter>
      </ItemContent>
    </Item>
  ),
};

export const Group: Story = {
  render: () => (
    <ItemGroup>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>企業名</ItemTitle>
          <ItemDescription>株式会社サンプル</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>職種</ItemTitle>
          <ItemDescription>ソフトウェアエンジニア</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>勤務地</ItemTitle>
          <ItemDescription>東京都渋谷区</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};
