export const metadata = {
  title: "TrackBased – Vibe Tracker",
  description: "VibeMarket activity tracker • packs • pulls • tokens • verified"
};

// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: "VibeMarket Tracker",
  description: "VibeMarket dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

