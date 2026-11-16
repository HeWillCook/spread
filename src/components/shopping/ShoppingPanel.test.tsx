import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeHeadcount } from "@/domain/headcount";
import { STARTER_RECIPES } from "@/domain/recipes";
import { buildShoppingList, totalCents, type DishPlan } from "@/domain/shopping";
import type { ShoppingPlan } from "@/services/shopping";
import { ShoppingPanel } from "./ShoppingPanel";
import type { ShoppingFormAction } from "./shoppingForm";

const ok: ShoppingFormAction = async (prev) => ({ error: null, saves: prev.saves + 1 });

type SavedState = Record<
  string,
  { checked?: boolean; checkedQty?: number | null; actualCents?: number | null }
>;

function planFrom(
  dishes: DishPlan[],
  headcount: ShoppingPlan["headcount"],
  state: SavedState = {},
  extras: ShoppingPlan["extras"] = [],
): ShoppingPlan {
  const built = buildShoppingList(dishes, headcount.planFor);
  const lines = built.map((l) => {
    const saved = state[l.itemId];
    const ticked = saved?.checked ?? false;
    // A tick fixture defaults to the current quantity unless it asks for a legacy (null) basis.
    const checkedQty = ticked ? (saved?.checkedQty === undefined ? l.buyQty : saved.checkedQty) : null;
    const needsReview = ticked && (checkedQty === null || l.buyQty > checkedQty);
    const dishNames = [...new Set(l.sources.map((s) => s.recipeName))];
    return {
      ...l,
      checked: ticked && !needsReview,
      checkedQty,
      needsReview,
      actualCents: saved?.actualCents ?? null,
      dishNames,
    };
  });
  const actual = Object.fromEntries(
    lines.filter((l) => l.actualCents !== null).map((l) => [l.itemId, l.actualCents as number]),
  );
  return {
    headcount,
    lines,
    extras,
    totalCents: totalCents(lines, actual, extras.map((e) => e.amountCents)),
    totalIsProvisional: lines.some((l) => l.needsReview),
  };
}

function planFor(yes: number, maybe: number, state: SavedState = {}, extras: ShoppingPlan["extras"] = []) {
  const people = [
    ...Array.from({ length: yes }, () => ({ status: "yes" as const, plusOnes: 0 })),
    ...Array.from({ length: maybe }, () => ({ status: "maybe" as const, plusOnes: 0 })),
  ];
  const headcount = computeHeadcount(people, 0.5);
  return planFrom([{ recipe: STARTER_RECIPES[0], servingsPerPerson: 1.5 }], headcount, state, extras);
}

function renderPanel(
  plan: ShoppingPlan,
  opts: {
    check?: ShoppingFormAction;
    price?: ShoppingFormAction;
    add?: ShoppingFormAction;
    remove?: ShoppingFormAction;
  } = {},
) {
  return render(
    <ShoppingPanel
      plan={plan}
      rangeNote="range 6–9 lb"
      lineActions={Object.fromEntries(
        plan.lines.map((l) => [
          l.itemId,
          { checkAction: opts.check ?? ok, priceAction: opts.price ?? ok },
        ]),
      )}
      extras={plan.extras.map((extra) => ({ extra, removeAction: opts.remove ?? ok }))}
      addExtraAction={opts.add ?? ok}
    />,
  );
}

function stubClipboard(value: { writeText: (text: string) => Promise<void> } | undefined) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("ShoppingPanel", () => {
  it("shows the headcount line, the buy quantity vs. the need, and the red total card", () => {
    renderPanel(planFor(12, 5));
    expect(screen.getByText("12 confirmed + ~3 from maybes · range 12–17")).toBeInTheDocument();
    expect(screen.queryByText("Shopping for ~15 people")).not.toBeInTheDocument();
    expect(screen.getByText("Buy 8 lb")).toBeInTheDocument();
    expect(screen.getByText("Buy 3 packs")).toBeInTheDocument();
    expect(screen.getByText("need 23 buns (packs of 8)")).toBeInTheDocument();
    expect(screen.getByText("$75.50")).toBeInTheDocument();
    // 7550 / 15 = 503.33 -> $5.03
    expect(screen.getByText("≈ $5.03 per guest (incl. extras)")).toBeInTheDocument();
    expect(screen.getByText("0 of 5 ingredients")).toBeInTheDocument();
  });

  it("groups the list by aisle with a header, alphabetised inside each group", () => {
    renderPanel(planFor(12, 5));
    const listCard = screen.getByRole("heading", { name: "Shopping list" }).closest(".ticket-surface")!;
    const headings = within(listCard as HTMLElement)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(["Produce", "Meat & seafood", "Dairy & eggs", "Bakery"]);
    const produce = screen.getByRole("heading", { name: "Produce" }).closest("section")!;
    expect(within(produce).getAllByText(/^(Onion|Jalapeño)$/).map((n) => n.textContent)).toEqual([
      "Jalapeño",
      "Onion",
    ]);
  });

  it("says which dishes a merged line is for", () => {
    const plan = planFrom(
      [
        { recipe: STARTER_RECIPES[0], servingsPerPerson: 1.5 },
        { recipe: STARTER_RECIPES.find((r) => r.id === "starter-hot-dogs")!, servingsPerPerson: 1.5 },
      ],
      computeHeadcount(
        Array.from({ length: 12 }, () => ({ status: "yes" as const, plusOnes: 0 })),
        0,
      ),
    );
    renderPanel(plan);
    expect(screen.getByText("for Burgers, Hot dogs")).toBeInTheDocument();
    expect(screen.getAllByText("Onion")).toHaveLength(1);
  });

  it("puts the range note on the beef line only, and the estimate in each price box", () => {
    renderPanel(planFor(12, 5));
    const note = screen.getByText("range 6–9 lb");
    expect(note.closest("div")).toHaveTextContent("Ground beef");
    expect(screen.getAllByText(/^range /)).toHaveLength(1);
    expect(screen.getByLabelText("Actual price for Ground beef")).toHaveAttribute(
      "placeholder",
      "52.00",
    );
  });

  it("shows an entered price in the box and the total uses it", () => {
    renderPanel(planFor(12, 5, { "starter-burgers-beef": { actualCents: 4999, checked: true } }));
    expect(screen.getByLabelText("Actual price for Ground beef")).toHaveValue("49.99");
    expect(screen.getByLabelText("Got Ground beef")).toBeChecked();
    expect(screen.getByLabelText("Got Burger buns")).not.toBeChecked();
    expect(screen.getByText("$73.49")).toBeInTheDocument();
    expect(screen.getByText("1 of 5 ingredients")).toBeInTheDocument();
  });

  it("unchecks an item whose quantity grew, says what to do, and marks the total provisional", () => {
    renderPanel(
      planFor(12, 5, {
        "starter-burgers-beef": { checked: true, checkedQty: 6, actualCents: 4999 },
      }),
    );
    expect(screen.getByLabelText("Got Ground beef")).not.toBeChecked();
    expect(
      screen.getByText(
        "Quantity increased: now 8 lb (was 6 lb). Tick again to confirm.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Total (provisional)")).toBeInTheDocument();
    expect(screen.getByText(/recheck the items whose quantity increased/)).toBeInTheDocument();
    // The real price already entered is kept and still shown; it is never erased.
    expect(screen.getByLabelText("Actual price for Ground beef")).toHaveValue("49.99");
    expect(screen.getByText(/paid \$49\.99/)).toBeInTheDocument();
  });

  it("treats a tick with no captured quantity as a legacy row needing a recheck", () => {
    renderPanel(
      planFor(12, 5, { "starter-burgers-beef": { checked: true, checkedQty: null } }),
    );
    expect(screen.getByLabelText("Got Ground beef")).not.toBeChecked();
    expect(
      screen.getByText(
        "Recheck this item: it was ticked before we tracked quantities. Tick again to confirm.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Total (provisional)")).toBeInTheDocument();
  });

  it("keeps a tick when the quantity went down", () => {
    renderPanel(
      planFor(12, 5, { "starter-burgers-beef": { checked: true, checkedQty: 9 } }),
    );
    expect(screen.getByLabelText("Got Ground beef")).toBeChecked();
    expect(screen.queryByText(/Quantity increased/)).not.toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("skips the 'from maybes' clause and the each-line when it has nothing to say", () => {
    renderPanel(planFor(0, 0));
    expect(screen.getByText("0 confirmed")).toBeInTheDocument();
    expect(screen.queryByText(/^≈/)).not.toBeInTheDocument();
  });

  it("says so when there are no dishes", () => {
    const plan = { ...planFor(12, 5), lines: [], totalCents: 0 };
    renderPanel(plan);
    expect(screen.getByText(/Nothing to buy yet/)).toBeInTheDocument();
  });

  it("submits a tick and a typed price when leaving the box", async () => {
    const check = vi.fn<ShoppingFormAction>().mockResolvedValue({ error: null, saves: 1 });
    const price = vi.fn<ShoppingFormAction>().mockResolvedValue({ error: null, saves: 1 });
    renderPanel(planFor(12, 5), { check, price });

    fireEvent.click(screen.getByLabelText("Got Ground beef"));
    await waitFor(() => expect(check).toHaveBeenCalledTimes(1));
    expect((check.mock.calls[0][1] as FormData).get("checked")).not.toBeNull();

    const box = screen.getByLabelText("Actual price for Ground beef");
    fireEvent.change(box, { target: { value: "$48.25" } });
    fireEvent.blur(box);
    await waitFor(() => expect(price).toHaveBeenCalledTimes(1));
    expect((price.mock.calls[0][1] as FormData).get("price")).toBe("$48.25");
  });

  it("ticks optimistically and reverts with an error when the save fails", async () => {
    let resolve!: (state: { error: string | null; saves: number }) => void;
    const check = vi.fn(
      () =>
        new Promise<{ error: string | null; saves: number }>((done) => {
          resolve = done;
        }),
    );
    renderPanel(planFor(12, 5), { check });
    const box = screen.getByLabelText("Got Ground beef");
    expect(box).not.toBeChecked();

    fireEvent.click(box);
    // The box flips before the action has answered.
    expect(box).toBeChecked();

    await act(async () => {
      resolve({ error: "Couldn't save that tick. Try again.", saves: 0 });
    });
    await waitFor(() => expect(box).not.toBeChecked());
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save that tick. Try again.");
  });

  it("hides ticked items on request without touching the server", () => {
    const check = vi.fn<ShoppingFormAction>();
    renderPanel(
      planFor(12, 5, { "starter-burgers-beef": { checked: true } }),
      { check },
    );
    expect(screen.getByText("Ground beef")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Hide items I've got"));
    expect(screen.queryByText("Ground beef")).not.toBeInTheDocument();
    expect(screen.getByText("Onion")).toBeInTheDocument();
    expect(check).not.toHaveBeenCalled();
  });

  it("copies the list as plain text and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    renderPanel(planFor(12, 5));

    fireEvent.click(screen.getByRole("button", { name: "Copy list" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("PRODUCE");
    expect(text).toContain("- [ ] Onion: 4");
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("explains when the clipboard is unavailable", async () => {
    stubClipboard(undefined);
    renderPanel(planFor(12, 5));
    fireEvent.click(screen.getByRole("button", { name: "Copy list" }));
    expect(
      await screen.findByText(/Couldn't copy automatically\. Select the list/),
    ).toBeInTheDocument();
  });

  it("shows a price error and keeps what was typed", async () => {
    const price = vi
      .fn<ShoppingFormAction>()
      .mockResolvedValue({ error: "Price should look like 3.50", saves: 0 });
    renderPanel(planFor(12, 5), { price });
    const box = screen.getByLabelText("Actual price for Ground beef");
    fireEvent.change(box, { target: { value: "lots" } });
    fireEvent.blur(box);
    expect(await screen.findByRole("alert")).toHaveTextContent("Price should look like 3.50");
    expect(box).toHaveValue("lots");
  });

  it("lists extras with a remove button, and submits a new one", async () => {
    const add = vi.fn<ShoppingFormAction>().mockResolvedValue({ error: null, saves: 1 });
    const remove = vi.fn<ShoppingFormAction>().mockResolvedValue({ error: null, saves: 1 });
    renderPanel(planFor(12, 5, {}, [{ id: "x1", label: "Ice", amountCents: 800 }]), { add, remove });

    expect(screen.getByText("Ice")).toBeInTheDocument();
    expect(screen.getByText("$8.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Ice" }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("What else did you buy?"), {
      target: { value: "Charcoal" },
    });
    fireEvent.change(screen.getByLabelText("Amount ($)"), { target: { value: "12.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Add cost" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    const fd = add.mock.calls[0][1] as FormData;
    expect(fd.get("label")).toBe("Charcoal");
    expect(fd.get("amount")).toBe("12.50");
    await waitFor(() => expect(screen.getByLabelText("What else did you buy?")).toHaveValue(""));
  });

  it("keeps a rejected extra in the form", async () => {
    const add = vi
      .fn<ShoppingFormAction>()
      .mockResolvedValue({ error: "Amount should look like 8.00", saves: 0 });
    renderPanel(planFor(12, 5), { add });
    fireEvent.change(screen.getByLabelText("What else did you buy?"), { target: { value: "Ice" } });
    fireEvent.change(screen.getByLabelText("Amount ($)"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Add cost" }));
    const alert = await screen.findByRole("alert");
    expect(within(alert.closest("form")!).getByLabelText("What else did you buy?")).toHaveValue("Ice");
  });
});
