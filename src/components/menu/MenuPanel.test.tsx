import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { STARTER_RECIPES } from "@/domain/recipes";
import type { MenuDish, MenuRecipe } from "@/services/menu";
import { MenuPanel } from "./MenuPanel";
import type { MenuFormAction } from "./menuForm";

const burgers = STARTER_RECIPES[0];
const dish: MenuDish = {
  dishId: "dish-1",
  servingsPerPerson: 1.5,
  recipe: burgers,
  isStarter: true,
};

const ok: MenuFormAction = async (prev) => ({ error: null, saves: prev.saves + 1 });

function renderPanel(
  props: Partial<{
    dishes: MenuDish[];
    available: MenuRecipe[];
    update: MenuFormAction;
    remove: MenuFormAction;
    add: MenuFormAction;
    create: MenuFormAction;
  }> = {},
) {
  return render(
    <MenuPanel
      dishes={(props.dishes ?? [dish]).map((d) => ({
        dish: d,
        updateAction: props.update ?? ok,
        removeAction: props.remove ?? ok,
      }))}
      available={props.available ?? []}
      addDishAction={props.add ?? ok}
      createDishAction={props.create ?? ok}
      planFor={4}
    />,
  );
}

function expandCard() {
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
}

describe("MenuPanel dish card", () => {
  it("is collapsed by default and summarises the dish", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: /Burgers/ })).toHaveTextContent("🍔");
    expect(screen.getByText("Starter recipe")).toBeInTheDocument();
    expect(
      screen.getByText("1.5 burgers per person · 6 burgers for 4 guests"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ground beef, Burger buns, Cheese slices +2 more"),
    ).toBeInTheDocument();
    expect(screen.getByText(/About \$.* for 4 guests · \$.* per person/)).toBeInTheDocument();
    // Editing inputs stay hidden until the host asks for them.
    expect(screen.queryByLabelText("burgers per person")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Ground beef (lb per burger)")).not.toBeInTheDocument();
    expect(screen.queryByText("How to make it")).not.toBeInTheDocument();
  });

  it("expands to the portion inputs and the how-to section, and flips aria-expanded", () => {
    renderPanel();
    const toggle = screen.getByRole("button", { name: "Edit details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    expandCard();

    expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByLabelText("burgers per person")).toHaveValue(1.5);
    expect(screen.getByLabelText("Ground beef (lb per burger)")).toHaveValue(0.333);
    expect(screen.getByLabelText("Burger buns (bun per burger)")).toHaveValue(1);
    expect(screen.getByLabelText("Onion (onion per burger)")).toHaveValue(0.167);
    expect(screen.getByText("How to make it")).toBeInTheDocument();
  });

  it("keeps the card expanded after a save", async () => {
    const update = vi.fn<MenuFormAction>().mockResolvedValue({ error: null, saves: 1 });
    renderPanel({ update });
    expandCard();

    fireEvent.change(screen.getByLabelText("burgers per person"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Burgers" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(screen.getByLabelText("burgers per person")).toHaveValue(2);
  });

  it("opens a newly added dish so the host can tune it", async () => {
    const add = vi.fn<MenuFormAction>().mockResolvedValue({
      error: null,
      saves: 1,
      added: { dishId: "dish-1", name: "Burgers" },
    });
    renderPanel({ available: [burgers], add });
    expect(screen.queryByLabelText("burgers per person")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Burgers" }));

    expect(await screen.findByLabelText("burgers per person")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide details" })).toBeInTheDocument();
  });

  it("shows the scaled prep quantities for the saved headcount and appetite", () => {
    renderPanel();
    expandCard();
    const prep = screen.getByRole("region", { name: "Burgers prep quantities" });
    expect(prep).toHaveTextContent("6 burgers for ~4 people");
    expect(prep).toHaveTextContent("6 bun");
    expect(prep).toHaveTextContent("Burger buns");
  });

  it("shows numbered steps and the time row when the recipe has them", () => {
    const withSteps: MenuRecipe = {
      ...burgers,
      id: "own-steps",
      name: "My Burgers",
      category: "Grill",
      prepMinutes: 15,
      cookMinutes: 20,
      steps: ["Form the patties.", "Grill 4 minutes a side."],
      equipment: ["Grill"],
      tips: ["Toast the buns."],
    };
    renderPanel({
      dishes: [{ ...dish, dishId: "dish-steps", recipe: withSteps, isStarter: false }],
    });

    expect(screen.getByText("35 min")).toBeInTheDocument();
    expect(screen.getByText("Grill")).toBeInTheDocument();
    expandCard();

    const steps = screen.getByText("Form the patties.").closest("ol");
    expect(steps?.tagName).toBe("OL");
    expect(within(steps as HTMLElement).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Form the patties.",
      "Grill 4 minutes a side.",
    ]);
    expect(screen.getByText("Prep 15 min · Cook 20 min · Total 35 min")).toBeInTheDocument();
    expect(screen.getByText("Toast the buns.")).toBeInTheDocument();
  });

  it("says so when a dish has no instructions yet", () => {
    renderPanel();
    expandCard();
    expect(screen.getByText(/No instructions yet/)).toBeInTheDocument();
  });

  it("submits the appetite and amounts keyed by recipe item id", async () => {
    const update = vi.fn<MenuFormAction>().mockResolvedValue({ error: null, saves: 1 });
    renderPanel({ update });
    expandCard();

    fireEvent.change(screen.getByLabelText("burgers per person"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Ground beef (lb per burger)"), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Burgers" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    const form = update.mock.calls[0][1];
    expect(form.get("servings")).toBe("2");
    expect(form.get("amount:starter-burgers-beef")).toBe("0.5");
    expect(form.get("amount:starter-burgers-buns")).toBe("1");
  });

  it("shows a friendly error and keeps what the host typed", async () => {
    const update = vi
      .fn<MenuFormAction>()
      .mockResolvedValue({ error: "Set at least a little per person, or remove the dish", saves: 0 });
    renderPanel({ update });
    expandCard();

    const input = screen.getByLabelText("burgers per person");
    fireEvent.change(input, { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Burgers" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Set at least a little per person, or remove the dish",
    );
    expect(screen.getByLabelText("burgers per person")).toHaveValue(7);
  });

  it("removes a dish through the remove action", async () => {
    const remove = vi.fn<MenuFormAction>().mockResolvedValue({ error: null, saves: 1 });
    renderPanel({ remove });
    fireEvent.click(screen.getByRole("button", { name: "Remove Burgers from the menu" }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
  });

  it("does not call a copy a starter", () => {
    renderPanel({ dishes: [{ ...dish, isStarter: false }] });
    expect(screen.queryByText("Starter recipe")).not.toBeInTheDocument();
  });

  it("shows an empty state with no dishes", () => {
    renderPanel({ dishes: [] });
    expect(screen.getByText(/Nothing on the menu yet/)).toBeInTheDocument();
  });
});

describe("MenuPanel add a dish", () => {
  it("lists available recipes and sends the chosen recipe id", async () => {
    const add = vi.fn<MenuFormAction>().mockResolvedValue({ error: null, saves: 1 });
    const slaw = { ...burgers, id: "r-slaw", name: "Coleslaw", emoji: "🥗" };
    renderPanel({ dishes: [], available: [burgers, slaw], add });

    expect(screen.getByText("Add a dish")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Coleslaw" }));

    await waitFor(() => expect(add).toHaveBeenCalled());
    expect(add.mock.calls[0][1].get("recipeId")).toBe("r-slaw");
  });

  it("shows the duplicate error from the action", async () => {
    const add = vi
      .fn<MenuFormAction>()
      .mockResolvedValue({ error: "Burgers is already on the menu", saves: 0 });
    renderPanel({ dishes: [], available: [burgers], add });
    fireEvent.click(screen.getByRole("button", { name: "Add Burgers" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Burgers is already on the menu");
  });

  it("says so when nothing is left to add", () => {
    renderPanel({ available: [] });
    expect(screen.getByText(/already on the menu/)).toBeInTheDocument();
  });
});

describe("MenuPanel create your own dish", () => {
  function fillIngredient(
    n: number,
    v: { name: string; amount: string; unit: string; buy: string; price: string },
  ) {
    const row = screen.getByRole("group", { name: `Ingredient ${n}` });
    fireEvent.change(within(row).getByLabelText("Ingredient name"), { target: { value: v.name } });
    fireEvent.change(within(row).getByLabelText("Amount per serving"), { target: { value: v.amount } });
    fireEvent.change(within(row).getByLabelText("Unit"), { target: { value: v.unit } });
    fireEvent.change(within(row).getByLabelText("Buy unit"), { target: { value: v.buy } });
    fireEvent.change(within(row).getByLabelText("Price per buy unit ($)"), {
      target: { value: v.price },
    });
  }
  const cabbage = { name: "Cabbage", amount: "0.25", unit: "head", buy: "head", price: "3.00" };
  const fillFirstIngredient = () => fillIngredient(1, cabbage);

  it("submits repeated ingredient rows in order", async () => {
    const create = vi.fn<MenuFormAction>().mockResolvedValue({ error: null, saves: 1 });
    renderPanel({ create });

    fireEvent.change(screen.getByLabelText("Dish name"), { target: { value: "Coleslaw" } });
    fillFirstIngredient();
    fireEvent.click(screen.getByRole("button", { name: "Add another ingredient" }));
    fillIngredient(2, { name: "Dressing", amount: "2", unit: "tbsp", buy: "bottle", price: "4.50" });
    fireEvent.click(screen.getByRole("button", { name: "Create dish" }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    const form = create.mock.calls[0][1];
    expect(form.get("name")).toBe("Coleslaw");
    expect(form.get("emoji")).toBe("🍽️");
    expect(form.get("servings")).toBe("1");
    expect(form.getAll("itemName")).toEqual(["Cabbage", "Dressing"]);
    expect(form.getAll("itemPerServing")).toEqual(["0.25", "2"]);
    expect(form.getAll("itemUnitsPerBuy")).toEqual(["1", "1"]);
    expect(form.getAll("itemPrice")).toEqual(["3.00", "4.50"]);
  });

  it("submits optional steps, tips and times", async () => {
    const create = vi.fn<MenuFormAction>().mockResolvedValue({ error: null, saves: 1 });
    renderPanel({ create });

    fireEvent.change(screen.getByLabelText("Dish name"), { target: { value: "Coleslaw" } });
    fillFirstIngredient();
    fireEvent.change(screen.getByLabelText("Prep minutes"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Cook minutes"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Steps (one per line)"), {
      target: { value: "Shred the cabbage.\n\nToss with dressing. " },
    });
    fireEvent.change(screen.getByLabelText("Tips (one per line)"), {
      target: { value: "Make it ahead." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create dish" }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    const form = create.mock.calls[0][1];
    expect(form.get("prepMinutes")).toBe("10");
    expect(form.get("cookMinutes")).toBe("0");
    expect(form.get("steps")).toBe("Shred the cabbage.\n\nToss with dressing. ");
    expect(form.get("tips")).toBe("Make it ahead.");
  });

  it("removes an ingredient row but keeps at least one", () => {
    renderPanel();
    expect(screen.queryByRole("button", { name: /Remove ingredient/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add another ingredient" }));
    expect(screen.getAllByRole("group", { name: /Ingredient \d/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove ingredient 2" }));
    expect(screen.getAllByRole("group", { name: /Ingredient \d/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Remove ingredient/ })).not.toBeInTheDocument();
  });

  it("keeps the typed values when the server rejects them", async () => {
    const create = vi
      .fn<MenuFormAction>()
      .mockResolvedValue({ error: 'Price for "Cabbage" should look like 3.50', saves: 0 });
    renderPanel({ create });
    fireEvent.change(screen.getByLabelText("Dish name"), { target: { value: "Coleslaw" } });
    fillFirstIngredient();
    fireEvent.click(screen.getByRole("button", { name: "Create dish" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("should look like 3.50");
    expect(screen.getByLabelText("Dish name")).toHaveValue("Coleslaw");
    expect(screen.getByLabelText("Ingredient name")).toHaveValue("Cabbage");
  });

  it("clears the form after a successful save", async () => {
    let saves = 0;
    const create: MenuFormAction = async () => ({ error: null, saves: ++saves });
    renderPanel({ create });
    fireEvent.change(screen.getByLabelText("Dish name"), { target: { value: "Coleslaw" } });
    fillFirstIngredient();
    fireEvent.click(screen.getByRole("button", { name: "Create dish" }));
    await waitFor(() => expect(screen.getByLabelText("Dish name")).toHaveValue(""));
    expect(screen.getByLabelText("Ingredient name")).toHaveValue("");
  });
});
