import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { JobDetailCard } from "./JobDetail";

const meta = {
  title: "Features/JobDetailCard",
  component: JobDetailCard,
} satisfies Meta<typeof JobDetailCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullData: Story = {
  args: {
    jobDetail: {
      jobNumber: "13080-12345678",
      companyName: "株式会社サンプル",
      occupation: "ソフトウェア開発技術者",
      employmentType: "正社員",
      wage: { min: 250000, max: 450000 },
      workPlace: "東京都渋谷区神宮前1-1-1",
      jobDescription:
        "Webアプリケーションの設計・開発・運用を担当していただきます。React/TypeScriptを用い��フロントエンド開発が中心です。",
      expiryDate: "2026-06-30",
      workingHours: { start: "09:00", end: "18:00" },
      qualifications: "TypeScript/React 実務経験3年以上",
      receivedDate: "2026-04-01",
      homePage: null,
      employeeCount: 150,
      establishmentNumber: null,
      jobCategory: null,
      industryClassification: null,
      publicEmploymentOffice: null,
      onlineApplicationAccepted: null,
      dispatchType: null,
      employmentPeriod: null,
      ageRequirement: null,
      education: null,
      requiredExperience: null,
      trialPeriod: null,
      carCommute: null,
      transferPossibility: null,
      wageType: null,
      raise: null,
      bonus: null,
      insurance: null,
      retirementBenefit: null,
    },
  },
};

export const LongDescription: Story = {
  args: {
    jobDetail: {
      jobNumber: "13080-11111111",
      companyName: "株式会社ロングテキスト",
      occupation: "ソフトウェア開発技術者",
      employmentType: "正社員",
      wage: { min: 300000, max: 500000 },
      workPlace: "東京都千代田区丸の内1-1-1",
      jobDescription:
        "【業務内容】\n自社プロダクトの企画・設計・開発・運用を一貫して担当していただきます。\n\n・React/TypeScript を用いたフロントエンド開発\n・Node.js/Effect によるバックエンド API 開発\n・AWS Lambda/SQS を活用したサーバーレスアーキテクチャの設計\n・Playwright による E2E テストの構築・運用\n・チームメンバーのコードレビュー\n\n【開発環境】\nTypeScript, React 19, Next.js 16, Effect, Hono, Cloudflare Workers, AWS CDK, PostgreSQL, Playwright, Biome, pnpm\n\n【働き方】\nフルリモート勤務可。フレックスタイム制（コアタイム 10:00-15:00）。月1回のオフィスデーあり。",
      expiryDate: "2026-08-31",
      workingHours: { start: "10:00", end: "19:00" },
      qualifications:
        "【必須】\n・TypeScript/React での開発経験 3年以上\n・チーム開発経験\n・Git を用いたバージョン管理の経験\n\n【歓迎】\n・Effect/fp-ts 等の関数型プログラミングライブラリの使用経験\n・AWS サーバーレスアーキテクチャの設計・構築経験\n・OSS へのコントリビュート経験",
      receivedDate: "2026-04-01",
      homePage: null,
      employeeCount: 50,
      establishmentNumber: null,
      jobCategory: null,
      industryClassification: null,
      publicEmploymentOffice: null,
      onlineApplicationAccepted: null,
      dispatchType: null,
      employmentPeriod: null,
      ageRequirement: null,
      education: null,
      requiredExperience: null,
      trialPeriod: null,
      carCommute: null,
      transferPossibility: null,
      wageType: null,
      raise: null,
      bonus: null,
      insurance: null,
      retirementBenefit: null,
    },
  },
};

export const MinimalData: Story = {
  args: {
    jobDetail: {
      jobNumber: "27010-87654321",
      companyName: null,
      occupation: "一般���務",
      employmentType: "パート",
      wage: null,
      workPlace: null,
      jobDescription: null,
      expiryDate: "2026-05-15",
      workingHours: null,
      qualifications: null,
      receivedDate: "2026-03-20",
      homePage: null,
      employeeCount: null,
      establishmentNumber: null,
      jobCategory: null,
      industryClassification: null,
      publicEmploymentOffice: null,
      onlineApplicationAccepted: null,
      dispatchType: null,
      employmentPeriod: null,
      ageRequirement: null,
      education: null,
      requiredExperience: null,
      trialPeriod: null,
      carCommute: null,
      transferPossibility: null,
      wageType: null,
      raise: null,
      bonus: null,
      insurance: null,
      retirementBenefit: null,
    },
  },
};
