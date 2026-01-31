import '../styles/globals.css';
import dynamic from 'next/dynamic';
const Web3Provider = dynamic(() => import('../components/Web3Provider'), { ssr: false });

export const metadata = {
  title: 'Trust or Doubt | GenLayer',
  description: 'Play a quick GenLayer-native Trust or Doubt mini-game powered by real-time scenarios.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="main-gradient">
        <Web3Provider>
          <div className="min-h-screen">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
