import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { JobSearchFilter } from "./JobSearchFilter";

const meta = {
  title: "Features/JobSearchFilter",
  component: JobSearchFilter,
} satisfies Meta<typeof JobSearchFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    defaultValue: {},
    onSubmit: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const companyInput = canvas.getByLabelText("会社名");
    await userEvent.type(companyInput, "テスト株式会社");

    const submitButton = canvas.getByRole("button", { name: "検索" });
    await userEvent.click(submitButton);

    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: "テスト株式会社" }),
    );
  },
};

export const WithDefaults: Story = {
  args: {
    defaultValue: {
      companyName: "サンプル",
      employmentType: "正社員",
      workPlace: "東京都",
      orderByReceiveDate: "desc",
      onlyNotExpired: "true",
    },
    onSubmit: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const companyInput = canvas.getByLabelText<HTMLInputElement>("会社名");
    await expect(companyInput.value).toBe("サンプル");
    const workPlaceInput = canvas.getByLabelText<HTMLInputElement>("勤務地");
    await expect(workPlaceInput.value).toBe("東京都");
  },
};

export const FilterByOccupation: Story = {
  args: {
    defaultValue: {},
    onSubmit: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const occupationInput = canvas.getByLabelText("職種");
    await userEvent.type(occupationInput, "エンジニア");

    const submitButton = canvas.getByRole("button", { name: "検索" });
    await userEvent.click(submitButton);

    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ occupation: "エンジニア" }),
    );
  },
};
