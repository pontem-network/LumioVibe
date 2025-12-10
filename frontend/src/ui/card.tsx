import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "#/utils/utils";

const cardVariants = cva(
  "w-full flex flex-col rounded-[12px] p-[20px] border border-[#2a2a2a] bg-[#0a0a0a]/95 relative transition-all duration-300 hover:border-[#3a3a3a]",
  {
    variants: {
      gap: {
        default: "gap-[10px]",
        large: "gap-6",
      },
      minHeight: {
        default: "min-h-[286px] md:min-h-auto",
        small: "min-h-[263.5px]",
      },
    },
    defaultVariants: {
      gap: "default",
      minHeight: "default",
    },
  },
);

interface CardProps extends VariantProps<typeof cardVariants> {
  children: ReactNode;
  className?: string;
  testId?: string;
}

export function Card({
  children,
  className = "",
  testId,
  gap,
  minHeight,
}: CardProps) {
  return (
    <div
      data-testid={testId}
      className={cn(cardVariants({ gap, minHeight }), className)}
    >
      {children}
    </div>
  );
}
