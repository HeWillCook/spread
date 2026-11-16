/** Form field names shared by the Menu forms and the server actions that read them. */
export const SERVINGS_FIELD = "servings";

/** Form field name for one item's amount on a dish: `amount:<recipe item id>`. */
export const amountField = (itemId: string) => `amount:${itemId}`;
export const AMOUNT_PREFIX = "amount:";

export const NEW_DISH_FIELDS = {
  name: "name",
  emoji: "emoji",
  servings: "servings",
  prepMinutes: "prepMinutes",
  cookMinutes: "cookMinutes",
  steps: "steps",
  tips: "tips",
  itemName: "itemName",
  itemEmoji: "itemEmoji",
  itemPerServing: "itemPerServing",
  itemUnit: "itemUnit",
  itemBuyUnit: "itemBuyUnit",
  itemUnitsPerBuy: "itemUnitsPerBuy",
  itemPrice: "itemPrice",
} as const;

/** Anchor id for a dish card, so adding a dish can scroll to it. */
export const dishAnchorId = (dishId: string) => `dish-${dishId}`;
