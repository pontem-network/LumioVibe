import { cn } from "#/utils/utils";

interface BrandButtonProps {
  testId?: string;
  name?: string;
  variant: "primary" | "secondary" | "danger" | "ghost-danger";
  type: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  isDisabled?: boolean;
  className?: string;
  onClick?: () => void;
  startContent?: React.ReactNode;
}

export function BrandButton({
  testId,
  name,
  children,
  variant,
  type,
  isDisabled,
  className,
  onClick,
  startContent,
}: React.PropsWithChildren<BrandButtonProps>) {
  return (
    <button
      name={name}
      data-testid={testId}
      disabled={isDisabled}
      // The type is alreadt passed as a prop to the button component
      // eslint-disable-next-line react/button-has-type
      type={type}
      onClick={onClick}
      className={cn(
        "w-fit p-2.5 px-4 text-sm rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-300",
        variant === "primary" &&
          "border border-[#2a2a2a] bg-[#0a0a0a] text-white font-medium hover:bg-[#1a1a1a] hover:border-[#3a3a3a]",
        variant === "secondary" &&
          "border border-[#2a2a2a] text-white bg-transparent hover:bg-[#1a1a1a] hover:border-[#3a3a3a]",
        variant === "danger" && "bg-red-600/90 text-white hover:bg-red-600",
        variant === "ghost-danger" &&
          "bg-transparent text-red-500 underline hover:text-red-400 hover:no-underline font-medium",
        startContent && "flex items-center justify-center gap-2",
        className,
      )}
    >
      {startContent}
      {children}
    </button>
  );
}
