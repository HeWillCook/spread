import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";

const EVENT_TIME = "2026-12-05T18:00";
const PHONE = { width: 390, height: 844 };

/** A unique email per sign-up so the tests never collide on one shared database. */
let counter = 0;
function uniqueEmail(label: string): string {
  counter += 1;
  return `${label}-${Date.now()}-${counter}@example.com`;
}

/** Signs a new host up and lands on their (empty) dashboard. */
async function signUp(page: Page, name: string): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(uniqueEmail(name.split(" ")[0].toLowerCase()));
  await page.getByLabel("Password").fill("correct-horse-battery");
  // The button stays disabled until the page has hydrated.
  const submit = page.getByRole("button", { name: "Create account" });
  await expect(submit).toBeEnabled();
  // Better Auth rate-limits sign-ups in production builds (about 3 per 10 seconds per
  // client), and these tests sign several hosts up in a row. A limited attempt shows an
  // error, so wait out the window and press the button again.
  await expect(async () => {
    await submit.click();
    await expect(page.getByRole("heading", { name: "Your cookouts" })).toBeVisible({ timeout: 3000 });
  }).toPass({ intervals: [4000], timeout: 60_000 });
}

/** Creates an event from the dashboard; returns its host URL and guest share link. */
async function createEvent(page: Page, title: string): Promise<{ eventUrl: string; shareLink: string }> {
  await page.getByRole("link", { name: "Create event" }).click();
  await page.getByLabel("What's the occasion?").fill(title);
  await page.getByLabel("Date and time").fill(EVENT_TIME);
  await page.getByLabel("Where?").fill("The backyard");
  const submit = page.getByRole("button", { name: "Create event" });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const eventUrl = page.url();

  // The dashboard shows the guest link under the event.
  await page.goto("/host");
  const shareLink = (await page.locator("p.select-all").first().innerText()).trim();
  expect(shareLink).toMatch(/\/e\/[^/]+$/);
  return { eventUrl, shareLink };
}

/** Opens a guest page in a brand-new browser context and answers the RSVP. */
async function rsvp(
  browser: Browser,
  shareLink: string,
  answer: { name: string; status: "Yes!" | "Maybe" | "Can't"; plusOnes?: string[] },
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: PHONE });
  const page = await context.newPage();
  await page.goto(shareLink);
  await page.getByLabel("Your name").fill(answer.name);
  const statusButton = page.getByRole("button", { name: answer.status, exact: true });
  // Clicks made before hydration are lost, so retry until the choice sticks.
  await expect(async () => {
    await statusButton.click();
    await expect(statusButton).toHaveAttribute("aria-pressed", "true", { timeout: 500 });
  }).toPass();
  for (const [i, plusOne] of (answer.plusOnes ?? []).entries()) {
    await page.getByRole("button", { name: "+ add a guest" }).click();
    await page.getByLabel(`Guest ${i + 1} name`).fill(plusOne);
  }
  await page.getByRole("button", { name: "Count me in" }).click();
  await expect(page.getByRole("button", { name: "Update my answer" })).toBeVisible();
  return { context, page };
}

/** The list row (one ingredient / one guest) that contains the given element. */
function rowOf(inner: Locator): Locator {
  return inner.locator("xpath=ancestor::div[contains(@class,'py-3')][1]");
}

test("host plans a burger night from sign-up to a changed RSVP", async ({ page, browser }) => {
  // 1. The host signs up, creates the event and reads the share link.
  await signUp(page, "Hannah Host");
  const { eventUrl, shareLink } = await createEvent(page, "Burger Night");
  await expect(page.getByText("0 coming")).toBeVisible();
  expect(new URL(shareLink).origin).toBe(new URL(eventUrl).origin);

  // 2. Privacy: a different host cannot open this event; it is a 404, not a redirect or a peek.
  const other = await browser.newContext({ viewport: PHONE });
  const otherPage = await other.newPage();
  await signUp(otherPage, "Olivia Other");
  const response = await otherPage.goto(eventUrl);
  expect(response?.status()).toBe(404);
  await other.close();

  // 3. A guest (fresh context, no account) says Yes and brings one person.
  const guest = await rsvp(browser, shareLink, {
    name: "Pat Guest",
    status: "Yes!",
    plusOnes: ["Sam Plusone"],
  });
  await expect(guest.page.getByRole("status")).toContainText("You're in!");
  await expect(guest.page).toHaveURL(/\/e\/[^/]+\/g\/[^/]+$/);

  // 4. The host's Guests tab counts both heads.
  await page.goto(eventUrl);
  await expect(page.getByText(/^2 confirmed/)).toBeVisible();
  await expect(page.getByText("2 coming")).toBeVisible();
  await expect(page.getByText("Pat Guest")).toBeVisible();

  // 5. Add the starter Burgers dish on the Menu tab.
  await page.getByRole("link", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Add Burgers" }).click();
  await expect(page.getByRole("button", { name: "Add Burgers" })).toHaveCount(0);

  // 6. Shopping: 2 heads x 1.5 = 3 burgers x 1/3 lb = 1 lb of beef.
  await page.getByRole("link", { name: "Shopping" }).click();
  const beef = rowOf(page.getByText("Ground beef", { exact: true }));
  await expect(beef).toContainText("1 lb");

  // 7. Split: tick the guest as attended and see what they owe.
  await page.getByRole("link", { name: "Split" }).click();
  const prompt = page.getByText("Tick who came to see what everyone owes");
  await expect(prompt).toBeVisible();
  const came = page.getByRole("checkbox", { name: "Pat Guest came" });
  await expect(async () => {
    await came.check();
    await expect(prompt).toHaveCount(0, { timeout: 1000 });
  }).toPass();
  const guestRow = rowOf(page.getByText("Pat Guest", { exact: true }));
  await expect(guestRow).toContainText(/\$\d+\.\d{2}/);
  await expect(guestRow).not.toContainText("$0.00");

  // 8. The guest reopens their link (the cookie sends them to their edit page) and backs out.
  await guest.page.goto(shareLink);
  await expect(guest.page).toHaveURL(/\/e\/[^/]+\/g\/[^/]+$/);
  await guest.page.getByRole("button", { name: "Can't", exact: true }).click();
  await guest.page.getByRole("button", { name: "Update my answer" }).click();
  await expect(guest.page.getByRole("status")).toContainText("Sorry you can't make it");

  // 9. The host's count drops to zero.
  await page.goto(eventUrl);
  await expect(page.getByText(/^0 confirmed/)).toBeVisible();
  await expect(page.getByText("0 coming")).toBeVisible();
  await guest.context.close();
});

test("guests never see other guests' names", async ({ page, browser }) => {
  await signUp(page, "Harper Host");
  const { shareLink } = await createEvent(page, "Pizza Night");

  const alice = await rsvp(browser, shareLink, {
    name: "Alice Anderson",
    status: "Yes!",
    plusOnes: ["Zed Zimmerman"],
  });
  const bob = await rsvp(browser, shareLink, { name: "Bob Brown", status: "Maybe" });

  // Bob's own page never mentions Alice or her plus-one (only a head count).
  const bobText = await bob.page.locator("body").innerText();
  expect(bobText).not.toContain("Alice Anderson");
  expect(bobText).not.toContain("Zed Zimmerman");

  // A stranger with just the public link sees the event and a count, no names.
  const stranger = await browser.newContext({ viewport: PHONE });
  const strangerPage = await stranger.newPage();
  await strangerPage.goto(shareLink);
  await expect(strangerPage.getByRole("heading", { name: "Pizza Night" })).toBeVisible();
  const strangerText = await strangerPage.locator("body").innerText();
  for (const name of ["Alice Anderson", "Zed Zimmerman", "Bob Brown"]) {
    expect(strangerText).not.toContain(name);
  }

  await Promise.all([alice.context.close(), bob.context.close(), stranger.close()]);
});

test("host removes a duplicate guest, charges a 'no' who came and a walk-in, then signs out", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000); // sign-up may wait out the auth rate limit
  await signUp(page, "Dana Host");
  const { eventUrl, shareLink } = await createEvent(page, "Taco Night");

  // The same person answered twice (two phones), and one guest said no.
  const first = await rsvp(browser, shareLink, { name: "Dup Guest", status: "Yes!" });
  const second = await rsvp(browser, shareLink, { name: "dup guest", status: "Maybe" });
  const nay = await rsvp(browser, shareLink, { name: "Nay Sayer", status: "Can't" });

  // Guests tab: both copies are flagged; removing one asks first, and leaves the other.
  await page.goto(eventUrl);
  await expect(page.getByText("possible duplicate")).toHaveCount(2);
  // Names differ only by case, so match the lower-case copy exactly.
  const remove = page.getByRole("button", { name: "Remove dup guest", exact: true });
  await expect(async () => {
    await remove.click();
    await expect(page.getByText("Really remove dup guest?")).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: "Yes, remove dup guest", exact: true }).click();
  await expect(page.getByText("possible duplicate")).toHaveCount(0);
  await expect(page.getByText("Dup Guest", { exact: true })).toBeVisible();
  await expect(page.getByText("dup guest", { exact: true })).toHaveCount(0);

  // Split tab: the "no" is collapsed under "Said no"; ticking them adds them to the split.
  await page.getByRole("link", { name: "Split" }).click();
  const saidNo = page.getByText("Said no (1)");
  await expect(saidNo).toBeVisible();
  await saidNo.click();
  const nayCame = page.getByRole("checkbox", { name: "Nay Sayer came" });
  await expect(async () => {
    await nayCame.check();
    await expect(page.getByText("Said no (1)")).toHaveCount(0, { timeout: 1000 });
  }).toPass();
  await expect(rowOf(page.getByText("Nay Sayer", { exact: true }))).toBeVisible();

  // A walk-in who never RSVPed, with one extra person.
  await page.getByLabel("Name", { exact: true }).fill("Walk In Wendy");
  await page.getByLabel("Extra people they brought").fill("1");
  await page.getByRole("button", { name: "Add to the split" }).click();
  const wendy = rowOf(page.getByText("Walk In Wendy", { exact: true }));
  await expect(wendy).toBeVisible();
  await expect(wendy).toContainText("+1");
  await expect(page.getByRole("checkbox", { name: "Walk In Wendy came" })).toBeChecked();

  // Sign out from the dashboard; the host area is closed afterwards.
  await page.goto("/host");
  const signOut = page.getByRole("button", { name: "Sign out" });
  await expect(async () => {
    await signOut.click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 2000 });
  }).toPass();
  await page.goto("/host");
  await expect(page).toHaveURL(/\/login$/);

  await Promise.all([first.context.close(), second.context.close(), nay.context.close()]);
});

test("landing page offers sign-up and log-in, and a signed-in host goes to their events", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Host a cookout" })).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  await page.getByRole("link", { name: "Host a cookout" }).click();
  await expect(page).toHaveURL(/\/signup$/);

  await signUp(page, "Lena Landing");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Host a cookout" })).toHaveCount(0);
  await page.getByRole("link", { name: "Go to your events" }).click();
  await expect(page).toHaveURL(/\/host$/);
});

test("a guest's personal link is private and 'not you' opens a blank form", async ({ page, browser }) => {
  await signUp(page, "Priya Host");
  const { shareLink } = await createEvent(page, "Chili Night");

  const guest = await rsvp(browser, shareLink, { name: "Gus Guest", status: "Yes!" });
  await expect(guest.page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(guest.page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  await expect(guest.page.getByText("This is your personal link")).toBeVisible();

  // "Not you?" skips the remembered-guest redirect and shows an empty form.
  await guest.page.getByRole("link", { name: "Not you? Answer as someone else" }).click();
  await expect(guest.page).toHaveURL(/\?new=1$/);
  await expect(guest.page.getByLabel("Your name")).toHaveValue("");
  await expect(guest.page.getByRole("button", { name: "Count me in" })).toBeVisible();
  await guest.context.close();
});
