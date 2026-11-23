import { ReactNode } from "react";

export const PageFooter = ({ children }: { children: ReactNode }) => {
  return <div className="p-4 fixed bottom-0 left-0 w-full">{children}</div>;
};
