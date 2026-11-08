import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("does arithmetic", () => {
    expect(1 + 1).toBe(2);
  });

  it("renders a component under jsdom", () => {
    render(createElement("div", null, "hi"));
    expect(screen.getByText("hi")).toBeInTheDocument();
  });
});
