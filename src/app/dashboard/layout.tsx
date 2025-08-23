import { ReactNode } from "react";
import Footer from "@/components/Footer";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">{children}</main>
      <Footer /> {/* footer only for dashboard */}
    </div>
  );
}
