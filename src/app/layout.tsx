import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | TURN8 Lead Tracker",
    default: "TURN8 Lead Tracker",
  },
  description: "Internal lead intelligence and outreach management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
