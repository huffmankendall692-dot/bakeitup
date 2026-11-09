import "./globals.css";

export const metadata = {
  title: "Baking It Up",
  description: "Turn the last of your ingredients into a recipe you can actually bake.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
