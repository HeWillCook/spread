import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RsvpForm, type RsvpFormEvent } from "./RsvpForm";

const event: RsvpFormEvent = {
  title: "Burger Night 🍔",
  when: "Sat · 7pm · Will's backyard",
  hostName: "Will",
  goingCount: 4,
};

const noopAction = async () => ({ error: null });

describe("RsvpForm", () => {
  it("shows the event details", () => {
    render(<RsvpForm event={event} action={noopAction} />);
    expect(
      screen.getByRole("heading", { name: "Burger Night 🍔" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sat · 7pm · Will's backyard")).toBeInTheDocument();
    expect(screen.getByText("Will")).toBeInTheDocument();
    expect(screen.getByText(/4 going so far/)).toBeInTheDocument();
  });

  it("marks only the tapped answer as pressed", () => {
    render(<RsvpForm event={event} action={noopAction} />);
    const yes = screen.getByRole("button", { name: "Yes!" });
    const maybe = screen.getByRole("button", { name: "Maybe" });
    const no = screen.getByRole("button", { name: "Can't" });
    expect(yes).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(maybe);
    expect(maybe).toHaveAttribute("aria-pressed", "true");
    expect(yes).toHaveAttribute("aria-pressed", "false");
    expect(no).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(no);
    expect(no).toHaveAttribute("aria-pressed", "true");
    expect(maybe).toHaveAttribute("aria-pressed", "false");
  });

  it("adds a plus-one name field when '+ add a guest' is tapped", () => {
    render(<RsvpForm event={event} action={noopAction} />);
    expect(screen.queryByLabelText(/guest 1 name/i)).not.toBeInTheDocument();
    expect(
      screen.getByText("Add a name so there's enough food for them too."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ add a guest" }));
    expect(screen.getByLabelText(/guest 1 name/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ add a guest" }));
    expect(screen.getByLabelText(/guest 2 name/i)).toBeInTheDocument();
  });

  it("caps plus-one fields at 10", () => {
    render(<RsvpForm event={event} action={noopAction} />);
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole("button", { name: "+ add a guest" }));
    }
    expect(screen.getByLabelText(/guest 10 name/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "+ add a guest" }),
    ).not.toBeInTheDocument();
  });

  it("removes a plus-one field", () => {
    render(<RsvpForm event={event} action={noopAction} />);
    fireEvent.click(screen.getByRole("button", { name: "+ add a guest" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove guest 1" }));
    expect(screen.queryByLabelText(/guest 1 name/i)).not.toBeInTheDocument();
  });

  it("disables submit until there is a name and an answer", () => {
    render(<RsvpForm event={event} action={noopAction} />);
    const submit = screen.getByRole("button", { name: "Count me in" });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Yes!" }));
    expect(submit).toBeDisabled(); // answer but no name

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Dana" } });
    expect(submit).toBeEnabled();

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "   " } });
    expect(submit).toBeDisabled(); // whitespace-only name
  });

  it("submits the entered values to the action", async () => {
    const action = vi.fn(async (_prev: unknown, formData: FormData) => {
      void formData;
      return { error: null };
    });
    render(<RsvpForm event={event} action={action} />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Dana" } });
    fireEvent.click(screen.getByRole("button", { name: "Maybe" }));
    fireEvent.click(screen.getByRole("button", { name: "+ add a guest" }));
    fireEvent.change(screen.getByLabelText(/guest 1 name/i), { target: { value: "Sam" } });
    fireEvent.change(screen.getByLabelText("Allergies or food notes"), { target: { value: "no peanuts" } });
    fireEvent.click(screen.getByRole("button", { name: "Send my RSVP" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0][1];
    expect(formData.get("name")).toBe("Dana");
    expect(formData.get("status")).toBe("maybe");
    expect(formData.getAll("plusOne")).toEqual(["Sam"]);
    expect(formData.get("foodNotes")).toBe("no peanuts");
  });

  it("prefills from initial and says 'Update my answer'", () => {
    render(
      <RsvpForm
        event={event}
        action={noopAction}
        initial={{
          id: "g1",
          name: "Dana",
          status: "maybe",
          plusOneNames: ["Sam", "Alex"],
          foodNotes: "no peanuts",
        }}
      />,
    );
    expect(screen.getByLabelText("Your name")).toHaveValue("Dana");
    expect(screen.getByRole("button", { name: "Maybe" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText(/guest 1 name/i)).toHaveValue("Sam");
    expect(screen.getByLabelText(/guest 2 name/i)).toHaveValue("Alex");
    expect(screen.getByLabelText("Allergies or food notes")).toHaveValue(
      "no peanuts",
    );
    const submit = screen.getByRole("button", { name: "Update my answer" });
    expect(submit).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Count me in" }),
    ).not.toBeInTheDocument();
  });

  it("uses a decline action for a guest who cannot attend", () => {
    render(<RsvpForm event={event} action={noopAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Can't" }));
    expect(screen.getByRole("button", { name: "Send my regrets" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Count me in" })).not.toBeInTheDocument();
  });

  it("shows an inline error returned by the action", async () => {
    const action = async () => ({ error: "Please use a shorter name." });
    render(<RsvpForm event={event} action={action} />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Dana" } });
    fireEvent.click(screen.getByRole("button", { name: "Yes!" }));
    fireEvent.click(screen.getByRole("button", { name: "Count me in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please use a shorter name.",
    );
  });

  it("read-only mode shows the event and the guest's answer, with nothing to submit", () => {
    render(
      <RsvpForm
        event={event}
        action={noopAction}
        readOnly
        initial={{
          id: "g1",
          name: "Dana",
          status: "maybe",
          plusOneNames: ["Sam", "Alex"],
          foodNotes: "no peanuts",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Burger Night 🍔" })).toBeInTheDocument();
    expect(screen.getByText("Dana · Maybe")).toBeInTheDocument();
    expect(screen.getByText(/Sam, Alex/)).toBeInTheDocument();
    expect(screen.getByText(/no peanuts/)).toBeInTheDocument();
    expect(screen.getByText(/RSVPs are closed/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Count me in|Update my answer/ })).not.toBeInTheDocument();
  });

  it("read-only mode without a saved answer says nothing is needed", () => {
    render(<RsvpForm event={event} action={noopAction} readOnly />);
    expect(
      screen.getByText("You can close this page. Nothing else is needed from you."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Count me in" })).not.toBeInTheDocument();
  });
});
