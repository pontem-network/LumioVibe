import { ReactNode } from "react";

interface TabContainerProps {
  children: ReactNode;
}

export function TabContainer({ children }: TabContainerProps) {
  return (
    <div className="bg-[#0a0a0a]/95 border border-[#2a2a2a] rounded-xl flex flex-col h-full w-full">
      {children}
    </div>
  );
}
