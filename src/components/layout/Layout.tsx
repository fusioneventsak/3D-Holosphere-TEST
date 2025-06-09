import React from 'react';
import Header from './Header';
import Footer from './Footer';

type LayoutProps = {
  children: React.ReactNode;
  onRequestDemo?: () => void;
};

const Layout: React.FC<LayoutProps> = ({ children, onRequestDemo }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Header onRequestDemo={onRequestDemo} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;