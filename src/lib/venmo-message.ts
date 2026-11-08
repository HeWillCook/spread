import { formatCents } from "@/domain/money";

/** The first word of a guest's name; "there" when the name is blank. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

/** The text the host shares with a guest: a greeting, the amount owed, and the Venmo link. */
export function buildVenmoMessage(o: {
  name: string;
  eventTitle: string;
  owedCents: number;
  url: string;
}): string {
  return `Hi ${firstName(o.name)}, your share of ${o.eventTitle} is ${formatCents(o.owedCents)}: ${o.url}`;
}
