'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WelcomeModal from '@/components/WelcomeModal';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <WelcomeModal />
      <main className="flex-grow overflow-y-auto">
        {children}
      </main>
      <Footer />
    </div>
  );
}
