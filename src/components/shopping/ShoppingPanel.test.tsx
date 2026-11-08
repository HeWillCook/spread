import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeHeadcount } from "@/domain/headcount";
import { STARTER_RECIPES } from "@/domain/recipes";
import { buildShoppingList, totalCents } from "@/domain/shopping";
import type { ShoppingPlan } from "@/services/shopping";
import { ShoppingPanel } from "./ShoppingPanel";
import type { ShoppingFormAction } from "./shoppingForm";

const ok: ShoppingFormAction = async (prev) => ({ error: null, saves: prev.saves + 1 });

function planFor(
  yes: number,
  maybe: number,
  state: Record<string, { checked?: boolean; actualCents?: number | null }> = {},
  extras: ShoppingPlan["extras"] = [],
): ShoppingPlan {
  const people = [
    ...Array.from({ length: yes }, () => ({ status: "yes" as const, plusOnes: 0 })),
    ...Array.from({ length: maybe }, () => ({ status: "maybe" as const, plusOnes: 0 })),
  ];
  const headcount = computeHeadcount(people, 0.5);
  const built = buildShoppingList(
    [{ recipe: STARTER_RECIPES[0], servingsPerPerson: 1.5 }],
    headcount.planFor,
  );
  const lines = built.map((l) => ({
    ...l,
    checked: state[l.itemId]?.checked ?? false,
    actualCents: state[l.itemId]?.actualCents ?? null,
  }));
  const actual = Object.fromEntries(
    lines.filter((l) => l.actualCents !== null).map((l) => [l.itemId, l.actualCents as number]),
  );
  return {
    headcount,
    lines,
    extras,
    totalCents: totalCents(lines, actual, extras.map((e) => e.amountCents)),
  };
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

describe("ShoppingPanel", () => {
  it("shows the headcount line, quantities in buy units, and the red total card", () => {
    renderPanel(planFor(12, 5));
    expect(screen.getByText("12 yes + ~3 from maybes · range 12–17")).toBeInTheDocument();
    expect(screen.getByText("Shopping for ~15 people")).toBeInTheDocument();
    expect(screen.getByText("8 lb")).toBeInTheDocument();
    expect(screen.getByText("3 packs")).toBeInTheDocument();
    expect(screen.getByText("1 pack")).toBeInTheDocument();
    expect(screen.getByText("$75.50")).toBeInTheDocument();
    // 7550 / 15 = 503.33 -> $5.03
    expect(screen.getByText("≈ $5.03 each")).toBeInTheDocument();
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
  });

  it("skips the 'from maybes' clause and the each-line when it has nothing to say", () => {
    renderPanel(planFor(0, 0));
    expect(screen.getByText("0 yes")).toBeInTheDocument();
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
