import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Headcount } from "@/domain/headcount";
import { STARTER_RECIPES } from "@/domain/recipes";
import type { MenuDish } from "@/services/menu";
import { WhatIfPlanner } from "./WhatIfPlanner";

const burgers: MenuDish = {
  dishId: "dish-burgers",
  servingsPerPerson: 1.5,
  recipe: STARTER_RECIPES[0],
  isStarter: true,
};

const plan: Headcount = {
  confirmed: 2,
  maybeHeads: 2,
  expectedFromMaybes: 1,
  planFor: 3,
  low: 2,
  high: 4,
};

function renderPlanner({
  dishes = [burgers],
  headcount = plan,
  unansweredCount,
}: {
  dishes?: MenuDish[];
  headcount?: Headcount;
  unansweredCount?: number;
} = {}) {
  return render(
    <WhatIfPlanner
      dishes={dishes}
      headcount={headcount}
      unansweredCount={unansweredCount}
    />,
  );
}

describe("WhatIfPlanner presets", () => {
  it("names the saved plan baseline and starts from it", () => {
    renderPlanner();
    expect(screen.getByRole("heading", { name: "Room for a few more?" })).toBeInTheDocument();
    expect(screen.getByText(/Saved plan: 3 people/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Confirmed: 2 people/ })).toBeInTheDocument();
    const current = screen.getByRole("button", { name: /^Current plan: 3 people/ });
    expect(current).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^All maybes: 4 people/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Previewing 3 people, the same as your saved plan. Ingredient estimates are unchanged.",
    );
  });

  it("compares confirmed guests with the saved plan in quantities, cost and the announcement", () => {
    renderPlanner();
    fireEvent.click(screen.getByRole("button", { name: /^Confirmed: 2 people/ }));

    expect(screen.getByRole("button", { name: /^Confirmed: 2 people/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Previewing 2 people, 1 fewer than your saved plan of 3 people. Ingredient estimates are $7.00 lower.",
    );
    expect(screen.getByText("3 burgers")).toBeInTheDocument();
    expect(screen.getByText("was 5 burgers")).toBeInTheDocument();

    const beef = screen.getByRole("row", { name: /Ground beef/ });
    expect(within(beef).getByText("2 lb")).toBeInTheDocument();
    expect(within(beef).getByText("1 lb")).toBeInTheDocument();
    expect(within(beef).getByText("1 lb fewer")).toBeInTheDocument();
    expect(within(beef).getByText("-$6.50")).toBeInTheDocument();

    expect(screen.getByText("$24.50")).toBeInTheDocument();
    expect(screen.getByText("$17.50")).toBeInTheDocument();
    expect(screen.getByText("-$7.00")).toBeInTheDocument();
  });

  it("explores all maybes without claiming the ingredient cost changed", () => {
    renderPlanner();
    fireEvent.click(screen.getByRole("button", { name: /^All maybes: 4 people/ }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Previewing 4 people, 1 more than your saved plan of 3 people. Ingredient estimates are unchanged.",
    );
    expect(screen.getByText("6 burgers")).toBeInTheDocument();
    expect(screen.getByText("was 5 burgers")).toBeInTheDocument();
    const beef = screen.getByRole("row", { name: /Ground beef/ });
    expect(within(beef).getByText("no change")).toBeInTheDocument();
  });

  it("handles equal presets without a false change announcement", () => {
    const same: Headcount = {
      confirmed: 4,
      maybeHeads: 0,
      expectedFromMaybes: 0,
      planFor: 4,
      low: 4,
      high: 4,
    };
    renderPlanner({ headcount: same });
    expect(
      screen.getByText("Confirmed, your saved plan and all maybes all come to 4 people right now."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^All maybes: 4 people/ }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Previewing 4 people, the same as your saved plan.",
    );
    expect(screen.queryByText(/more than your saved plan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/fewer than your saved plan/)).not.toBeInTheDocument();
  });
});

describe("WhatIfPlanner custom headcount", () => {
  it("previews a valid custom count and leaves presets unpressed", () => {
    renderPlanner();
    const input = screen.getByLabelText("Try a headcount");
    expect(input).toHaveAttribute("max", "29");
    expect(input).toHaveAttribute("min", "0");

    fireEvent.change(input, { target: { value: "2" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Previewing 2 people, 1 fewer than your saved plan of 3 people.",
    );
    expect(screen.getByRole("button", { name: /^Current plan: 3 people/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps the last valid preview and explains invalid transient input", () => {
    renderPlanner();
    const input = screen.getByLabelText("Try a headcount");

    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.change(input, { target: { value: "2.5" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Use a whole number of people.");
    expect(screen.getByRole("alert")).toHaveTextContent("preview still shows 2 people");
    expect(screen.getByRole("status")).toHaveTextContent("Previewing 2 people");

    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a whole number of people.");
    expect(screen.getByRole("status")).toHaveTextContent("Previewing 2 people");

    fireEvent.change(input, { target: { value: "30" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose 29 people or fewer.");
    expect(screen.getByRole("status")).toHaveTextContent("Previewing 2 people");
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
  });

  it("clears the custom text when a preset is chosen", () => {
    renderPlanner();
    const input = screen.getByLabelText("Try a headcount");
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /^Current plan: 3 people/ }));
    expect(input).toHaveValue(null);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("WhatIfPlanner edge cases", () => {
  it("handles zero guests and zero headcount", () => {
    const zero: Headcount = {
      confirmed: 0,
      maybeHeads: 0,
      expectedFromMaybes: 0,
      planFor: 0,
      low: 0,
      high: 0,
    };
    renderPlanner({ headcount: zero });
    expect(
      screen.getByText("No confirmed or maybe guests yet, so every option is 0 people."),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Previewing 0 people");
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
  });

  it("shows a useful empty state when no dishes are saved", () => {
    renderPlanner({ dishes: [] });
    expect(screen.getByText(/No dishes on the menu yet/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Previewing 3 people, the same as your saved plan.",
    );
  });

  it("treats unanswered invitations as unknown, not as guests", () => {
    renderPlanner({ unansweredCount: 5 });
    expect(screen.getByText(/Plus-ones are included in these counts/)).toBeInTheDocument();
    expect(screen.getByText(/5 invitations have no reply yet/)).toBeInTheDocument();
    expect(screen.getByText(/aren't counted in any headcount here/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Previewing 3 people");
    expect(screen.queryByText(/Previewing 8 people/)).not.toBeInTheDocument();
  });

  it("updates the baseline and current-plan preview when saved data refreshes", () => {
    const { rerender } = renderPlanner();
    expect(screen.getByText(/Saved plan: 3 people/)).toBeInTheDocument();

    const updated: Headcount = {
      confirmed: 3,
      maybeHeads: 2,
      expectedFromMaybes: 2,
      planFor: 5,
      low: 3,
      high: 5,
    };
    rerender(<WhatIfPlanner dishes={[burgers]} headcount={updated} />);
    expect(screen.getByText(/Saved plan: 5 people/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Previewing 5 people");
    expect(screen.getByRole("button", { name: /^Current plan: 5 people/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("WhatIfPlanner honesty and read-only scope", () => {
  it("labels estimates, excludes actual spend and extras, and makes no writes", () => {
    const { container } = renderPlanner();
    expect(
      screen.getByText(/Ingredient estimates use your saved price per buy unit/),
    ).toBeInTheDocument();
    expect(screen.getByText(/don't include actual spend or extras/)).toBeInTheDocument();
    expect(screen.getByText(/doesn't change RSVPs, the menu, the shopping list or payments/)).toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Save\b/i })).not.toBeInTheDocument();
  });
});
