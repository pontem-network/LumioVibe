/* eslint-disable i18next/no-literal-string */
import { useState } from "react";
import { useAuthWallet } from "#/hooks/use-auth";
import "./wallet.css";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";

const DECIMALS = 8;

export function WalletUpBalance() {
  const auth = useAuthWallet();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(10);

  const switchModal = () => setOpen(!open);
  const closeModal = () => setOpen(false);
  const topUpBalance = async () => {
    try {
      const amountInUnits = Math.round(value * 10 ** DECIMALS);
      await auth.topUpBalance(amountInUnits);
      closeModal();
      displaySuccessToast("Balance replenished");
    } catch (error: unknown) {
      displayErrorToast((error as Error).message);
    }
  };

  return (
    <div className="top_up">
      <button className="top_up_balance" type="button" onClick={switchModal}>
        top up balance
      </button>
      {open && (
        <div className="top_up_modal">
          <label htmlFor="top_up_amount">Amount (LUM)</label>
          <input
            id="top_up_amount"
            name="top_up_amount"
            type="number"
            min="0.00000001"
            max="10000"
            step="0.01"
            defaultValue="10"
            onChange={(e) => setValue(parseFloat(e.target.value))}
          />
          <div className="foot">
            <button type="button" className="cancel" onClick={closeModal}>
              Cancel
            </button>
            <button type="button" className="submit" onClick={topUpBalance}>
              Deposit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
