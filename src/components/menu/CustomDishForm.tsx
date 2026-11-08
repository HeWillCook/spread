"use client";

import { useActionState, useRef, useState } from "react";
import { NEW_DISH_FIELDS as F } from "@/lib/menu-fields";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { FormError, INITIAL_MENU_FORM_STATE, type MenuFormAction } from "./menuForm";

const MAX_ITEMS = 30;
const DEFAULT_EMOJI = "🍽️";

interface ItemDraft {
  key: number;
  name: string;
  emoji: string;
  perServing: string;
  unit: string;
  buyUnit: string;
  unitsPerBuy: string;
  price: string;
}

type TextKey = Exclude<keyof ItemDraft, "key">;

function blankItem(key: number): ItemDraft {
  return {
    key,
    name: "",
    emoji: DEFAULT_EMOJI,
    perServing: "",
    unit: "",
    buyUnit: "",
    unitsPerBuy: "1",
    price: "",
  };
}

/** The inputs, controlled so a rejected save keeps everything typed. Remounted after a save. */
function Fields({ pending, error }: { pending: boolean; error: string | null }) {
  const nextKey = useRef(1);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [servings, setServings] = useState("1");
  const [items, setItems] = useState<ItemDraft[]>(() => [blankItem(0)]);

  const setItem = (key: number, field: TextKey, value: string) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, [field]: value } : i)));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <Field
          label="Dish name"
          name={F.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Coleslaw"
          required
        />
        <Field
          label="Emoji"
          name={F.emoji}
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          maxLength={16}
          required
        />
      </div>
      <Field
        label="Servings per person"
        hint="How many of this dish one person eats, like 1.5 burgers."
        name={F.servings}
        type="number"
        inputMode="decimal"
        min={0}
        max={20}
        step="any"
        value={servings}
        onChange={(e) => setServings(e.target.value)}
        required
      />

      {items.map((item, index) => (
        <fieldset
          key={item.key}
          className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-divider p-3"
        >
          <legend className="px-1 text-sm font-bold">Ingredient {index + 1}</legend>
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <Field
              label="Ingredient name"
              name={F.itemName}
              value={item.name}
              onChange={(e) => setItem(item.key, "name", e.target.value)}
              maxLength={80}
              required
            />
            <Field
              label="Emoji"
              name={F.itemEmoji}
              value={item.emoji}
              onChange={(e) => setItem(item.key, "emoji", e.target.value)}
              maxLength={16}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Amount per serving"
              name={F.itemPerServing}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={item.perServing}
              onChange={(e) => setItem(item.key, "perServing", e.target.value)}
              required
            />
            <Field
              label="Unit"
              hint="lb, slice, cup..."
              name={F.itemUnit}
              value={item.unit}
              onChange={(e) => setItem(item.key, "unit", e.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Buy unit"
              hint="pack, bag, each..."
              name={F.itemBuyUnit}
              value={item.buyUnit}
              onChange={(e) => setItem(item.key, "buyUnit", e.target.value)}
              maxLength={80}
              required
            />
            <Field
              label="Units per buy"
              hint="How many of the unit in one buy unit."
              name={F.itemUnitsPerBuy}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={item.unitsPerBuy}
              onChange={(e) => setItem(item.key, "unitsPerBuy", e.target.value)}
              required
            />
          </div>
          <Field
            label="Price per buy unit ($)"
            name={F.itemPrice}
            inputMode="decimal"
            placeholder="3.50"
            value={item.price}
            onChange={(e) => setItem(item.key, "price", e.target.value)}
            required
          />
          {items.length > 1 ? (
            <Button
              variant="outline"
              onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}
            >
              Remove ingredient {index + 1}
            </Button>
          ) : null}
        </fieldset>
      ))}

      {items.length < MAX_ITEMS ? (
        <Button
          variant="outline"
          onClick={() => setItems((list) => [...list, blankItem(nextKey.current++)])}
        >
          Add another ingredient
        </Button>
      ) : null}

      <FormError message={error} />
      <Button variant="red" type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create dish"}
      </Button>
    </div>
  );
}

/** "Create your own dish": a custom recipe that is saved and put on this event's menu. */
export function CustomDishForm({ action }: { action: MenuFormAction }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_MENU_FORM_STATE);
  return (
    <Card>
      <details open={state.error !== null || undefined}>
        <summary className="cursor-pointer text-lg font-bold">Create your own dish</summary>
        <form action={formAction} className="mt-4">
          {/* Remounting after each successful save clears the fields. */}
          <Fields key={state.saves} pending={pending} error={state.error} />
        </form>
      </details>
    </Card>
  );
}
