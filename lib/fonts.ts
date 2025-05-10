import localFont from "next/font/local";

export const gillSans = localFont({
  src: [
    {
      path: "../styles/fonts/GillSans.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-gill-sans",
});

export const gillSansBold = localFont({
  src: [
    {
      path: "../styles/fonts/GillSansBold.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-gill-sans-bold",
});

export const specter = localFont({
  src: [
    {
      path: "../styles/fonts/Specter.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-specter",
});

export const specterThin = localFont({
  src: [
    {
      path: "../styles/fonts/SpecterThin.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-specter-thin",
});

export const specterBold = localFont({
  src: [
    {
      path: "../styles/fonts/SpecterBold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-specter-bold",
});
