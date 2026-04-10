import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { createStore, Provider } from "jotai";
import { expect, within } from "storybook/test";
import { favoriteJobsAtom } from "@/atom";
import type { JobOverview } from "@/dto";
import Page from "./page";

const mockFavorites: JobOverview[] = [
  {
    jobNumber: "13010-12345678",
    companyName: "株式会社テスト",
    occupation: "ソフトウェアエンジニア",
    employmentType: "正社員",
    workPlace: "東京都渋谷区",
    employeeCount: 100,
    receivedDate: "2026-04-01T00:00:00Z",
  },
  {
    jobNumber: "27010-87654321",
    companyName: "合同会社サンプル",
    occupation: "バックエンドエンジニア",
    employmentType: "正社員以外",
    workPlace: "大阪府大阪市北区",
    employeeCount: 50,
    receivedDate: new Date().toISOString(),
  },
];

const meta = {
  title: "Pages/FavoritesPage",
  component: Page,
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFavorites: Story = {
  decorators: [
    (Story) => {
      const store = createStore();
      store.set(favoriteJobsAtom, mockFavorites);
      return (
        <Provider store={store}>
          <Story />
        </Provider>
      );
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("お気に入り求人一覧")).toBeInTheDocument();
    await expect(
      canvas.getByText("ソフトウェアエンジニア"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("バックエンドエンジニア"),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText("お気に入り解除")).toHaveLength(2);
  },
};

export const Empty: Story = {
  decorators: [
    (Story) => (
      <Provider>
        <Story />
      </Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("お気に入り求人一覧")).toBeInTheDocument();
    await expect(canvas.queryByText("お気に入り解除")).not.toBeInTheDocument();
  },
};
