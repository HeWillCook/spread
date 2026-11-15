import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { Card, CardRow } from "./Card";
import { Field } from "./Field";
import { Pill } from "./Pill";
import { TabBar } from "./TabBar";
import { Wordmark } from "./Wordmark";

describe("TabBar", () => {
  const tabs = [
    { label: "Plan", href: "/plan" },
    { label: "Guests", href: "/guests" },
    { label: "Food", href: "/food" },
  ];

  it("marks only the tab matching activeHref as current", () => {
    render(<TabBar tabs={tabs} activeHref="/guests" />);
    const current = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Guests");
    expect(screen.getByRole("link", { name: "Plan" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks nothing current when no href matches", () => {
    render(<TabBar tabs={tabs} activeHref="/nope" />);
    expect(
      screen.getAllByRole("link").some((a) => a.hasAttribute("aria-current")),
    ).toBe(false);
  });
});

describe("Button", () => {
  it("renders a button with an accessible name", () => {
    render(<Button variant="red">Add guest</Button>);
    expect(screen.getByRole("button", { name: "Add guest" })).toBeInTheDocument();
  });

  it("defaults to type=button and passes through props", () => {
    render(
      <Button variant="outline" disabled>
        Cancel
      </Button>,
    );
    const b = screen.getByRole("button", { name: "Cancel" });
    expect(b).toHaveAttribute("type", "button");
    expect(b).toBeDisabled();
  });

  it("allows type=submit", () => {
    render(
      <Button variant="mustard" type="submit">
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});

describe("Field", () => {
  it("associates the label with the input", () => {
    render(<Field label="Guest name" />);
    expect(screen.getByLabelText("Guest name")).toBeInstanceOf(HTMLInputElement);
  });

  it("shows a hint and links it via aria-describedby", () => {
    render(<Field label="Phone" hint="We only text on party day" />);
    const input = screen.getByLabelText("Phone");
    const hint = screen.getByText("We only text on party day");
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("passes input props through", () => {
    render(<Field label="Email" type="email" placeholder="a@b.co" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });
});

describe("Wordmark, Pill, Card", () => {
  it("renders the Spread wordmark with a period", () => {
    render(<Wordmark />);
    expect(screen.getByText("Spread")).toBeInTheDocument();
    expect(screen.getByText(".")).toBeInTheDocument();
  });

  it("renders pill and card children", () => {
    render(
      <Card className="extra">
        <Pill>4 coming</Pill>
      </Card>,
    );
    expect(screen.getByText("4 coming")).toBeInTheDocument();
    expect(screen.getByText("4 coming").parentElement).toHaveClass("extra");
  });

  it("renders card rows with dashed dividers", () => {
    render(
      <Card>
        <CardRow>Burgers</CardRow>
        <CardRow>Hot dogs</CardRow>
      </Card>,
    );
    expect(screen.getByText("Hot dogs")).toHaveClass("border-dashed");
  });
});
