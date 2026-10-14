import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });

export const metadata: Metadata = {
  title: "Connor Murphy — Software Engineer",
  description:
    "Connor Murphy: B.S. Computer Science, University of New Hampshire. A Career fieldbook: the work, thinking, evidence, and practice behind a pragmatic job hunt. Explore seven walkthrough chapters, projects, and the résumé.",
};

const themeScript = `try{const t=localStorage.getItem("personal-os-theme");if(t)document.documentElement.dataset.theme=t}catch{}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${manrope.variable} ${sourceSerif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
