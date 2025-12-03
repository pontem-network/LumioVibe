/* eslint-disable i18next/no-literal-string */
import { useRef, useState } from "react";
import { useAuthWallet } from "#/hooks/use-auth";
import "./wallet.css";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";

export function WalletUpBalance() {
  const auth = useAuthWallet();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(1000000);
  const inputRef = useRef(null);

  const switchModal = () => setOpen(!open);
  const closeModal = () => setOpen(false);
  const topUpBalance = async () => {
    try {
      await auth.topUpBalance(value);
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
          <label htmlFor="top_up_amount">The amount of the deposit</label>
          <input
            ref={inputRef}
            id="top_up_amount"
            name="top_up_amount"
            type="number"
            min="1000"
            max="1000000000"
            defaultValue="1000000"
            onChange={(e) => setValue(parseInt(e.target.value, 10))}
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
