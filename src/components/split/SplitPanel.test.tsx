import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SplitRow, SplitView } from "@/services/split";
import { SplitPanel } from "./SplitPanel";
import type { SplitFormAction } from "./splitForm";

const ok: SplitFormAction = async (prev) => ({ error: null, saves: prev.saves + 1 });

function row(over: Partial<SplitRow> & { guestId: string; name: string }): SplitRow {
  return {
    attended: false,
    excluded: false,
    paid: false,
    linkSentAt: null,
    heads: 1,
    owedCents: 0,
    venmoUrl: null,
    ...over,
  };
}

function view(rows: SplitRow[], over: Partial<SplitView> = {}): SplitView {
  return {
    eventTitle: "Burger Night",
    rows,
    totalCents: 7550,
    hostCoveredCents: 0,
    unassignedCents: 0,
    venmoUsername: null,
    ...over,
  };
}

function renderPanel(
  v: SplitView,
  opts: Partial<Record<"attended" | "excluded" | "paid" | "linkSent" | "cover" | "venmo", SplitFormAction>> = {},
  hostCoverCents = 0,
) {
  return render(
    <SplitPanel
      view={v}
      hostCoverCents={hostCoverCents}
      rowActions={Object.fromEntries(
        v.rows.map((r) => [
          r.guestId,
          {
            attendedAction: opts.attended ?? ok,
            excludedAction: opts.excluded ?? ok,
            paidAction: opts.paid ?? ok,
            linkSentAction: opts.linkSent ?? ok,
          },
        ]),
      )}
      coverAction={opts.cover ?? ok}
      venmoAction={opts.venmo ?? ok}
    />,
  );
}

describe("SplitPanel", () => {
  it("shows the empty state, the total and a tick box per guest when nobody is ticked", () => {
    renderPanel(view([row({ guestId: "a", name: "Ann" }), row({ guestId: "b", name: "Bo", heads: 3 })]));
    expect(screen.getByText("Tick who came to see what everyone owes")).toBeInTheDocument();
    expect(screen.getByText("$75.50")).toBeInTheDocument();
    expect(screen.queryByText(/about/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ann came")).not.toBeChecked();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.queryByText("Send Venmo link")).not.toBeInTheDocument();
  });

  it("shows owed amounts, 'about each', a Venmo link and a link-sent badge for attended guests", () => {
    const url = "https://venmo.com/willcook?txn=pay&audience=private&amount=37.75&note=x";
    renderPanel(
      view(
        [
          row({ guestId: "a", name: "Ann", attended: true, owedCents: 3775, venmoUrl: url }),
          row({
            guestId: "b",
            name: "Bo",
            attended: true,
            owedCents: 3775,
            venmoUrl: url,
            linkSentAt: new Date(),
            paid: true,
          }),
        ],
        { venmoUsername: "willcook" },
      ),
    );
    expect(screen.queryByText(/Tick who came to see/)).not.toBeInTheDocument();
    expect(screen.getByText("$75.50 total · about $37.75 each")).toBeInTheDocument();
    expect(screen.getAllByText("$37.75")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Send Venmo link to Ann" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open link for Ann/ })).toHaveAttribute("href", url);
    expect(screen.getAllByText("link sent")).toHaveLength(1);
    expect(screen.getByLabelText("Ann paid")).not.toBeChecked();
    expect(screen.getByLabelText("Bo paid")).toBeChecked();
    expect(screen.getByText("1 of 2 paid")).toBeInTheDocument();
  });

  it("has no Venmo link without a username, and none for an excluded guest", () => {
    renderPanel(
      view([
        row({ guestId: "a", name: "Ann", attended: true, owedCents: 7550 }),
        row({ guestId: "k", name: "Kid", attended: true, excluded: true }),
      ]),
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Exclude Kid")).toBeChecked();
    expect(screen.queryByLabelText("Kid paid")).not.toBeInTheDocument();
  });

  it("submits ticks, the exclude toggle and the paid box", async () => {
    const attended = vi.fn<SplitFormAction>().mockResolvedValue({ error: null, saves: 1 });
    const excluded = vi.fn<SplitFormAction>().mockResolvedValue({ error: null, saves: 1 });
    const paid = vi.fn<SplitFormAction>().mockResolvedValue({ error: null, saves: 1 });
    renderPanel(
      view([
        row({ guestId: "a", name: "Ann" }),
        row({ guestId: "b", name: "Bo", attended: true, owedCents: 7550 }),
      ]),
      { attended, excluded, paid },
    );
    fireEvent.click(screen.getByLabelText("Ann came"));
    await waitFor(() => expect(attended).toHaveBeenCalledTimes(1));
    expect((attended.mock.calls[0][1] as FormData).get("attended")).not.toBeNull();

    fireEvent.click(screen.getByLabelText("Exclude Bo"));
    await waitFor(() => expect(excluded).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText("Bo paid"));
    await waitFor(() => expect(paid).toHaveBeenCalledTimes(1));
  });

  describe("Send Venmo link", () => {
    const url = "https://venmo.com/x?txn=pay&amount=75.50";
    const message = `Hi Ann, your share of Burger Night is $75.50: ${url}`;
    let linkSent: ReturnType<typeof vi.fn<SplitFormAction>>;

    beforeEach(() => {
      linkSent = vi.fn<SplitFormAction>().mockResolvedValue({ error: null, saves: 1 });
      renderPanel(
        view([row({ guestId: "a", name: "Ann Lee", attended: true, owedCents: 7550, venmoUrl: url })]),
        { linkSent },
      );
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      Reflect.deleteProperty(navigator, "share");
      Reflect.deleteProperty(navigator, "clipboard");
    });

    const sendButton = () => screen.getByRole("button", { name: "Send Venmo link to Ann Lee" });

    it("shares the message and marks it sent once the share succeeds", async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: share, configurable: true });
      fireEvent.click(sendButton());
      await waitFor(() => expect(linkSent).toHaveBeenCalledTimes(1));
      expect(share).toHaveBeenCalledWith({ text: message });
    });

    it("does not mark it sent when the share sheet is cancelled", async () => {
      const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
      Object.defineProperty(navigator, "share", { value: share, configurable: true });
      fireEvent.click(sendButton());
      await waitFor(() => expect(share).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 20));
      expect(linkSent).not.toHaveBeenCalled();
    });

    it("does not mark it sent when sharing fails and there is no clipboard", async () => {
      const share = vi.fn().mockRejectedValue(new Error("nope"));
      Object.defineProperty(navigator, "share", { value: share, configurable: true });
      fireEvent.click(sendButton());
      expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't share or copy/);
      expect(linkSent).not.toHaveBeenCalled();
    });

    it("copies to the clipboard when sharing is unavailable, says so, then marks it sent", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      fireEvent.click(sendButton());
      expect(await screen.findByText(/Copied!/)).toBeInTheDocument();
      expect(writeText).toHaveBeenCalledWith(message);
      await waitFor(() => expect(linkSent).toHaveBeenCalledTimes(1));
    });

    it("does not mark it sent when the clipboard write is refused", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("denied"));
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      fireEvent.click(sendButton());
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText(/Copied!/)).not.toBeInTheDocument();
      expect(linkSent).not.toHaveBeenCalled();
    });

    it("offers a safe Open link that never marks it sent", async () => {
      const link = screen.getByRole("link", { name: /Open link for Ann Lee/ });
      expect(link).toHaveAttribute("href", url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("rel")).toContain("noreferrer");
      fireEvent.click(link);
      await new Promise((r) => setTimeout(r, 20));
      expect(linkSent).not.toHaveBeenCalled();
    });
  });

  it("hides Open link for a URL that is not on venmo.com", () => {
    renderPanel(
      view([row({ guestId: "a", name: "Ann", attended: true, owedCents: 100, venmoUrl: "https://evil.example/x" })]),
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("submits the cover and Venmo name, and shows a rejected value's error", async () => {
    const cover = vi.fn<SplitFormAction>().mockResolvedValue({ error: null, saves: 1 });
    const venmo = vi
      .fn<SplitFormAction>()
      .mockResolvedValue({ error: "Venmo usernames are 5 to 30 letters", saves: 0 });
    renderPanel(view([]), { cover, venmo });
    fireEvent.change(screen.getByLabelText("You cover ($)"), { target: { value: "10" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);
    await waitFor(() => expect(cover).toHaveBeenCalledTimes(1));
    expect((cover.mock.calls[0][1] as FormData).get("cover")).toBe("10");

    fireEvent.change(screen.getByLabelText("Your Venmo username"), { target: { value: "bad name" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[1]);
    expect(await screen.findByRole("alert")).toHaveTextContent("5 to 30");
  });

  it("shows what the host covers and a saved cover in the box", () => {
    renderPanel(
      view([row({ guestId: "a", name: "Ann", attended: true, owedCents: 5550 })], {
        hostCoveredCents: 2000,
        venmoUsername: "willcook",
      }),
      {},
      2000,
    );
    expect(screen.getByText("You cover $20.00")).toBeInTheDocument();
    expect(screen.getByLabelText("You cover ($)")).toHaveValue("20.00");
    expect(screen.getByLabelText("Your Venmo username")).toHaveValue("willcook");
  });

  it("says so when there are no guests", () => {
    renderPanel(view([]));
    expect(screen.getByText(/No guests yet/)).toBeInTheDocument();
  });
});
