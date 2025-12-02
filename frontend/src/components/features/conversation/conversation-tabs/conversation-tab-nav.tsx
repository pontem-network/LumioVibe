import { ComponentType } from "react";
import { cn } from "#/utils/utils";

type ConversationTabNavProps = {
  icon: ComponentType<{ className: string }>;
  onClick(): void;
  isActive?: boolean;
  label?: string;
  className?: string;
};

export function ConversationTabNav({
  icon: Icon,
  onClick,
  isActive,
  label,
  className,
}: ConversationTabNavProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex items-center gap-2 rounded-md cursor-pointer",
        "pl-1.5 pr-2 py-1",
        "text-white/60",
        isActive && "bg-[#1a1a1a]/50 text-white",
        isActive
          ? "hover:text-white hover:bg-[#2a2a2a]/50"
          : "hover:text-white hover:bg-[#1a1a1a]/50",
        isActive ? "focus-within:text-white" : "focus-within:text-white/60",
        className,
      )}
    >
      <Icon className={cn("w-5 h-5 text-inherit flex-shrink-0")} />
      {isActive && label && (
        <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      )}
    </div>
  );
}
