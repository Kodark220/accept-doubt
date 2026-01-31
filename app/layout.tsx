import '../styles/globals.css';
import Web3Provider from '../components/Web3Provider';

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
