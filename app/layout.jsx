import "./globals.css";
import Web3Provider from "../components/Web3Provider";

export const metadata = {
  title: "TrackBased – Vibe Tracker",
  description: "VibeMarket activity tracker • packs • pulls • tokens • verified"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
