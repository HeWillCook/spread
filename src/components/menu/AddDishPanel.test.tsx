import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STARTER_RECIPES } from "@/domain/recipes";
import type { Recipe } from "@/domain/recipes";
import { AddDishPanel } from "./AddDishPanel";
import type { MenuFormAction } from "./menuForm";

const ok: MenuFormAction = async (prev) => ({ error: null, saves: prev.saves + 1 });

const ownDish: Recipe = {
  ...STARTER_RECIPES[0],
  id: "own-chili",
  name: "My Chili",
  items: STARTER_RECIPES[0].items.map((item, i) => ({ ...item, id: `${item.id}-chili-${i}` })),
};

describe("AddDishPanel picker", () => {
  it("groups recipes and searches by name", async () => {
    render(<AddDishPanel recipes={[...STARTER_RECIPES, ownDish]} action={ok} />);

    expect(screen.getByRole("group", { name: "Dish categories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Burgers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add My Chili" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Find a dish"), { target: { value: "chili" } });
    expect(screen.queryByRole("button", { name: "Add Burgers" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add My Chili" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Find a dish"), { target: { value: "zzz" } });
    expect(screen.getByText(/No dish matches/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show every dish" }));
    expect(screen.getByRole("button", { name: "Add Burgers" })).toBeInTheDocument();
  });

  it("filters by category chip", async () => {
    render(<AddDishPanel recipes={[...STARTER_RECIPES, ownDish]} action={ok} />);

    fireEvent.click(screen.getByRole("button", { name: "Your dishes" }));
    expect(screen.getByRole("button", { name: "Add My Chili" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Burgers" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByRole("button", { name: "Add Burgers" })).toBeInTheDocument();
  });
});
