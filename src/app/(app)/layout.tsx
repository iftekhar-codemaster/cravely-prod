import { AuthProvider } from "@/components/AuthProvider";
import AppGate from "@/components/AppGate";
import BottomNav from "@/components/BottomNav";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthProvider>
      <AppGate>
        <ImpersonationBanner />
        <main className="w-full max-w-md mx-auto bg-white min-h-screen shadow-2xl relative pb-32">
          {children}
        </main>
        <BottomNav />
      </AppGate>
    </AuthProvider>
  );
}
