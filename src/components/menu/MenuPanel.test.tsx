import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { STARTER_RECIPES } from "@/domain/recipes";
import type { MenuDish } from "@/services/menu";
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
    available: typeof STARTER_RECIPES;
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

describe("MenuPanel dish card", () => {
  it("shows the emoji, name, appetite and per-item amounts with units", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: /Burgers/ })).toHaveTextContent("🍔");
    expect(screen.getByLabelText("burgers per person")).toHaveValue(1.5);
    // The beef amount is the patty weight.
    expect(screen.getByLabelText("Ground beef (lb per burger)")).toHaveValue(0.3333);
    expect(screen.getByLabelText("Burger buns (bun per burger)")).toHaveValue(1);
    expect(screen.getByLabelText("Onion (onion per burger)")).toHaveValue(0.1667);
    expect(screen.getByText("Starter recipe")).toBeInTheDocument();
  });

  it("shows the scaled prep quantities for the saved headcount and appetite", () => {
    renderPanel();
    const prep = screen.getByRole("region", { name: "Burgers prep quantities" });
    expect(prep).toHaveTextContent("6 burgers for ~4 people");
    expect(prep).toHaveTextContent("6 bun");
    expect(prep).toHaveTextContent("Burger buns");
  });

  it("submits the appetite and amounts keyed by recipe item id", async () => {
    const update = vi.fn<MenuFormAction>().mockResolvedValue({ error: null, saves: 1 });
    renderPanel({ update });

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
      .mockResolvedValue({ error: "Servings per person must be a number from 0 to 20", saves: 0 });
    renderPanel({ update });

    const input = screen.getByLabelText("burgers per person");
    fireEvent.change(input, { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Burgers" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Servings per person must be a number from 0 to 20",
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
