import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import {
  type CompanyResponse,
  mockJobs,
  setMockCompanies,
  setMockJobs,
} from "@/lib/backend-client.mock";
import Page from "./page";

const establishmentNumber = "0101-626495-7";

const mockCompany: CompanyResponse = {
  establishmentNumber,
  companyName: "株式会社テスト",
  postalCode: "150-0001",
  address: "東京都渋谷区神宮前1-2-3",
  employeeCount: 120,
  foundedYear: "2001",
  capital: "1000万円",
  businessDescription: "Webアプリケーションの企画・開発・運用",
  corporateNumber: "9430001008073",
};

const jobsForThisCompany = mockJobs.slice(0, 3).map((j) => ({
  ...j,
  establishmentNumber,
}));

const meta = {
  title: "Pages/CompanyDetailRSCPage",
  component: Page,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: `/companies/${establishmentNumber}`,
      },
    },
  },
  async beforeEach() {
    setMockCompanies([mockCompany]);
    setMockJobs(jobsForThisCompany);
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    params: Promise.resolve({ establishmentNumber }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("株式会社テスト")).toBeInTheDocument();
    await expect(
      canvas.getByText(`事業所番号: ${establishmentNumber}`),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/この事業所の求人/)).toBeInTheDocument();
  },
};

export const NoJobs: Story = {
  async beforeEach() {
    setMockCompanies([mockCompany]);
    setMockJobs([]);
  },
  args: {
    params: Promise.resolve({ establishmentNumber }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("掲載中の求人はありません。"),
    ).toBeInTheDocument();
  },
};

export const NotFound: Story = {
  async beforeEach() {
    setMockCompanies([]);
    setMockJobs([]);
  },
  args: {
    params: Promise.resolve({ establishmentNumber: "9999-999999-9" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("事業所が見つかりませんでした。"),
    ).toBeInTheDocument();
  },
};
