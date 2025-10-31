import { expect, test } from "@playwright/test";

test.describe("/jobs 求人一覧ページ", () => {
  test("求人情報の取得に失敗していない", async ({ page }) => {
    await page.goto("/jobs");
    // 求人情報が表示されていることを確認
    const text = page.locator("text=求人情報の取得に失敗しました。");
    await expect(text).toHaveCount(0);
  });
});
