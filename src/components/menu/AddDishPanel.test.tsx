import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

const burgers = STARTER_RECIPES[0];

describe("AddDishPanel picker", () => {
  it("groups recipes and searches by name", () => {
    render(<AddDishPanel recipes={[...STARTER_RECIPES, ownDish]} action={ok} />);

    expect(screen.getByRole("group", { name: "Dish categories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Burgers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add My Chili" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Find a dish"), { target: { value: "chili" } });
    expect(screen.queryByRole("button", { name: "Add Burgers" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add My Chili" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Find a dish"), { target: { value: "zzz" } });
    expect(screen.getByText(/No dish matches/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("button", { name: "Add Burgers" })).toBeInTheDocument();
  });

  it("never adds a dish when Enter is pressed in the search box", async () => {
    const add = vi.fn<MenuFormAction>().mockResolvedValue({ error: null, saves: 1 });
    render(<AddDishPanel recipes={[burgers]} action={add} />);

    const search = screen.getByLabelText("Find a dish");
    fireEvent.change(search, { target: { value: "burg" } });
    fireEvent.keyDown(search, { key: "Enter", code: "Enter", charCode: 13 });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(add).not.toHaveBeenCalled();
  });

  it("matches ingredient names and says which ingredient matched", () => {
    const greens: Recipe = { ...burgers, id: "own-greens", name: "Garden Salad", items: [] };
    render(<AddDishPanel recipes={[burgers, greens]} action={ok} />);

    fireEvent.change(screen.getByLabelText("Find a dish"), { target: { value: "onion" } });
    expect(screen.getByRole("button", { name: "Add Burgers" })).toBeInTheDocument();
    expect(screen.getByText("has onion")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Garden Salad" })).not.toBeInTheDocument();
  });

  it("matches category and description too", () => {
    const leafy: Recipe = {
      id: "own-greens",
      name: "Garden Salad",
      emoji: "🥗",
      defaultServingsPerPerson: 1,
      description: "Crisp lettuce with lemon",
      items: [],
    };
    render(<AddDishPanel recipes={[leafy, burgers]} action={ok} />);

    fireEvent.change(screen.getByLabelText("Find a dish"), { target: { value: "grill" } });
    expect(screen.getByRole("button", { name: "Add Burgers" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Garden Salad" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Find a dish"), { target: { value: "lemon" } });
    expect(screen.getByRole("button", { name: "Add Garden Salad" })).toBeInTheDocument();
  });

  it("previews the description, times, ingredients and cost per person", () => {
    const described = {
      ...burgers,
      description: "Smash-style patties with all the fixings",
      prepMinutes: 15,
      cookMinutes: 20,
    };
    render(<AddDishPanel recipes={[described]} action={ok} />);

    expect(screen.getByText("1.5 burgers per person · 35 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview Burgers" }));

    const preview = screen.getByRole("region", { name: "Preview Burgers" });
    expect(preview).toHaveTextContent("Smash-style patties with all the fixings");
    expect(preview).toHaveTextContent("Prep 15 min · Cook 20 min · Total 35 min");
    expect(preview).toHaveTextContent("Ground beef");
    expect(preview).toHaveTextContent("Estimated $");
    expect(preview).toHaveTextContent("per person");
    // Add stays available while the preview is open.
    expect(screen.getByRole("button", { name: "Add Burgers" })).toBeInTheDocument();
  });

  it("names the category and query in the empty state and offers both resets", () => {
    render(<AddDishPanel recipes={[burgers, ownDish]} action={ok} />);

    fireEvent.click(screen.getByRole("button", { name: "Grill" }));
    fireEvent.change(screen.getByLabelText("Find a dish"), { target: { value: "zzz" } });
    expect(screen.getByText(/No grill dish matches/)).toBeInTheDocument();
    expect(screen.getByText(/“zzz”/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all categories" }));
    // The query still excludes everything, so only the search reset is left.
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("button", { name: "Add My Chili" })).toBeInTheDocument();
  });

  it("keeps the search visible when every dish is already on the menu", () => {
    render(<AddDishPanel recipes={[]} action={ok} />);
    expect(screen.getByLabelText("Find a dish")).toBeInTheDocument();
    expect(screen.getByText(/already on the menu/)).toBeInTheDocument();
  });

  it("announces a dish that was added", async () => {
    const add = vi.fn<MenuFormAction>().mockResolvedValue({
      error: null,
      saves: 1,
      added: { dishId: "dish-1", name: "Burgers" },
    });
    render(<AddDishPanel recipes={[burgers]} action={add} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Burgers" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Added Burgers to the menu");
    await waitFor(() => expect(add).toHaveBeenCalled());
  });
});
