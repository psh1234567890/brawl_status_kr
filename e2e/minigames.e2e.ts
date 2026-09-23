import { expect, test } from "@playwright/test";

test.use({ locale: "ko-KR" });

test("home shortcut and hub open the Brawler Name Quiz", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("complementary").getByRole("link", { name: /미니게임/ }).click();
  await expect(page).toHaveURL(/\/minigames$/);
  await expect(page.getByRole("heading", { level: 1, name: "브롤스타즈 미니게임" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "브롤러 이름 맞히기" })).toBeVisible();
  await page.getByRole("link", { name: "게임 시작" }).click();
  await expect(page).toHaveURL(/\/minigames\/brawler-quiz$/);
});

test("quiz starts, accepts a correct answer, ignores duplicates and wrong answers, then reveals misses", async ({ page }) => {
  await page.goto("/minigames/brawler-quiz");
  await expect(page.getByRole("button", { name: "게임 시작" })).toBeVisible();
  await expect(page.getByText(/전체 브롤러 \d+명/)).toBeVisible();
  await page.getByRole("button", { name: "게임 시작" }).click();

  const answer = page.getByRole("textbox", { name: "브롤러 이름" });
  await expect(answer).toBeFocused();
  await answer.fill("쉘리");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar", { name: "맞힌 브롤러" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByRole("list", { name: "맞힌 브롤러" })).toBeVisible();

  await answer.fill("shelly");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar", { name: "맞힌 브롤러" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByText("이미 맞힌 브롤러입니다.")).toBeVisible();

  await answer.fill("__NOT_A_BRAWLER__");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar", { name: "맞힌 브롤러" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByText("명단에 없는 이름입니다. 다시 시도해 보세요.")).toBeVisible();

  await expect(page.getByRole("region", { name: "놓친 브롤러" })).toHaveCount(0);
  await page.getByRole("button", { name: "포기하고 결과 보기" }).click();
  await expect(page.getByRole("heading", { name: "도전 결과" })).toBeVisible();
  await expect(page.getByRole("region", { name: "놓친 브롤러" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 도전" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("brawl-status:minigames:brawler-quiz:v1:best") ?? "{}")["5m"]?.found)).toBe(1);
  await page.reload();
  await expect(page.getByText(/최고 기록: 1 \/ \d+ \(/)).toBeVisible();
});

test("localized English quiz renders English controls and accepts English answers", async ({ page }) => {
  await page.goto("/en/minigames/brawler-quiz");
  await expect(page.getByRole("heading", { level: 1, name: "Brawler Name Quiz" })).toBeVisible();
  await page.getByRole("button", { name: "Start game" }).click();
  const answer = page.getByRole("textbox", { name: "Brawler name" });
  await answer.fill("SHELLY");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar", { name: "Brawlers found" })).toHaveAttribute("aria-valuenow", "1");
});
