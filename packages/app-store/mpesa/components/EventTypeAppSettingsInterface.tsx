import type { EventTypeAppSettingsComponent } from "@kalo/app-store/types";
import { convertToSmallestCurrencyUnit, convertFromSmallestToPresentableCurrencyUnit } from "@kalo/lib/currencyConversions";
import { TextField } from "@kalo/ui/components/form";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({ getAppData, setAppData, disabled }) => {
  const price = getAppData("price");
  return (
    <div className="mt-4">
      <TextField
        label="Price (KES)"
        type="number"
        min="1"
        step="1"
        required
        disabled={disabled}
        value={price > 0 ? String(convertFromSmallestToPresentableCurrencyUnit(price, "KES")) : ""}
        onChange={(event) => setAppData("price", convertToSmallestCurrencyUnit(Number(event.target.value), "KES"))}
      />
      <p className="mt-2 text-xs text-subtle">Customers pay through a Safaricom Daraja STK Push. Payment is confirmed only after the callback is verified.</p>
      <input type="hidden" value="KES" readOnly />
    </div>
  );
};

export default EventTypeAppSettingsInterface;
