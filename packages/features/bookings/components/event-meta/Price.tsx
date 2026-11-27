import { formatPrice } from "@kalo/lib/currencyConversions";
import type { EventPrice } from "@kalo/features/bookings/types";

export const Price = ({ price, currency }: EventPrice) => {
  if (price === 0) return null;
  return <>{formatPrice(price, currency)}</>;
};
