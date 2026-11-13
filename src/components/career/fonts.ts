import { Manrope, Newsreader, Public_Sans, Source_Serif_4 } from "next/font/google";

/* The fieldbook's own typefaces. Declared here rather than in the root layout so
   Next.js preloads them only on routes that render the fieldbook (home and /career),
   not on the case studies and timeline, which set type in Geist.
   Manrope and Source Serif only appear in a few views, so they are not preloaded at all:
   the browser fetches them when a view uses them. */
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader" });
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", preload: false });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", preload: false });

export const fieldbookFontVariables = [newsreader, publicSans, manrope, sourceSerif].map((font) => font.variable).join(" ");
