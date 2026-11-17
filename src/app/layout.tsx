import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Providers } from "@/components/Providers";
import {
  APP_APPLE_TOUCH_ICON_PATH,
  APP_DESCRIPTION,
  APP_FAVICON_ICO_PATH,
  APP_FAVICON_SVG_PATH,
  APP_NAME,
} from "@/config/brand";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    // Dedicated favicon assets — do not use the landscape company logo here.
    // Paths include content hashes so immutable Cache-Control stays safe.
    icon: [
      { url: APP_FAVICON_ICO_PATH, sizes: "32x32" },
      { url: APP_FAVICON_ICO_PATH, sizes: "48x48" },
      { url: APP_FAVICON_SVG_PATH, type: "image/svg+xml" },
    ],
    shortcut: APP_FAVICON_ICO_PATH,
    apple: [{ url: APP_APPLE_TOUCH_ICON_PATH, sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} min-h-screen bg-paper font-sans text-ink antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
