import "./globals.css";

export const metadata = {
  title: "Baking It Up",
  description: "Recipes, timers, and tips to help you bake with confidence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
