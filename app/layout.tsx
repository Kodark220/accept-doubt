import '../styles/globals.css';

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
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
