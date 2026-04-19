import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { type ReactNode, useEffect } from "react";
import { expect, within } from "storybook/test";
import paginationStyles from "./JobsPagination.module.css";
import { JobsPagination } from "./JobsPagination_client";

function ForcePending({
  children,
  pageLabel,
}: {
  children: ReactNode;
  pageLabel: string;
}) {
  useEffect(() => {
    const apply = () => {
      const spans = document.querySelectorAll<HTMLSpanElement>(
        'nav[aria-label="Pagination"] a > span',
      );
      for (const s of spans) {
        if (s.textContent?.trim() === pageLabel) {
          s.classList.add(paginationStyles.pending);
          s.setAttribute("aria-disabled", "true");
          return true;
        }
      }
      return false;
    };
    if (apply()) return;
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pageLabel]);
  return <>{children}</>;
}

const meta = {
  title: "Pages/JobsPage/Pagination",
  component: JobsPagination,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/jobs" },
    },
  },
} satisfies Meta<typeof JobsPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {
  args: { currentPage: 1, totalPages: 10 },
};

export const MiddlePage: Story = {
  args: { currentPage: 5, totalPages: 10 },
};

export const LastPage: Story = {
  args: { currentPage: 10, totalPages: 10 },
};

export const FewPages: Story = {
  args: { currentPage: 2, totalPages: 3 },
};

export const NextHref: Story = {
  args: { currentPage: 3, totalPages: 10 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const next = canvas.getByRole("link", { name: "次へ" });

    await expect(next).toHaveAttribute("href", "/jobs?page=4&");
  },
};

export const PrevHref: Story = {
  args: { currentPage: 5, totalPages: 10 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const prev = canvas.getByRole("link", { name: "前へ" });

    await expect(prev).toHaveAttribute("href", "/jobs?page=4&");
  },
};

export const PrevDisabledOnFirstPage: Story = {
  args: { currentPage: 1, totalPages: 10 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const prev = canvas.queryByRole("link", { name: "前へ" });

    await expect(prev).not.toBeInTheDocument();
    await expect(canvas.getByText("前へ")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};

export const PendingDuringNavigation: Story = {
  args: { currentPage: 5, totalPages: 10 },
  decorators: [
    (Story) => (
      <ForcePending pageLabel="6">
        <Story />
      </ForcePending>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pending = canvas.getByText("6");

    await expect(pending).toHaveAttribute("aria-disabled", "true");
  },
};

export const NextDisabledOnLastPage: Story = {
  args: { currentPage: 10, totalPages: 10 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const next = canvas.queryByRole("link", { name: "次へ" });

    await expect(next).not.toBeInTheDocument();
    await expect(canvas.getByText("次へ")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};
