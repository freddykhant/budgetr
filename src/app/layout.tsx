import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ToastProvider } from "./_components/toast-provider";

export const metadata: Metadata = {
  title: "budgie",
  description: "stupidly simple monthly budget planning",
  icons: [{ rel: "icon", url: "/budgie_1.png" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <ToastProvider>{children}</ToastProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
