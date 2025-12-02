import { useTranslation } from "react-i18next";
import { cn } from "#/utils/utils";

export function LoadingMicroagentTextarea() {
  const { t } = useTranslation();

  return (
    <textarea
      required
      disabled
      defaultValue=""
      placeholder={t("MICROAGENT$LOADING_PROMPT")}
      rows={6}
      className={cn(
        "bg-tertiary border border-[#2a2a2a] w-full rounded p-2 placeholder:italic placeholder:text-tertiary-alt resize-none",
        "disabled:bg-[#1a1a1a] disabled:border-[#1a1a1a] disabled:cursor-not-allowed",
      )}
    />
  );
}
