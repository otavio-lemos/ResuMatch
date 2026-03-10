'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WelcomeModal from '@/components/WelcomeModal';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <WelcomeModal />
      <div className="flex-grow flex flex-col">
        {children}
      </div>
      <Footer />
    </div>
  );
}
