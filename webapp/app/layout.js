import './globals.css';
import { AuthProvider } from '../lib/AuthProvider';

export const metadata = {
  title: 'Booking Control — School Events',
  description: 'Internal booking platform for school events',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
