import '../styles/globals.css';
import ClientOnlyWeb3Provider from '../components/ClientOnlyWeb3Provider';

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
        <ClientOnlyWeb3Provider>
          <div className="min-h-screen">
            {children}
          </div>
        </ClientOnlyWeb3Provider>
      </body>
    </html>
  );
}
