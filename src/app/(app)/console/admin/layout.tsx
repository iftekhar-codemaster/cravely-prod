import type { ReactNode } from "react";
import ConsoleShell from "@/components/console/AdminConsole";

export default function AdminConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
