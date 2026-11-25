import Link from "next/link";

const LINKS = [
  { href: "/kitchen", label: "Home" },
  { href: "/generator", label: "Generator" },
  { href: "/recipes", label: "Recipe book" },
  { href: "/preferences", label: "Preferences" },
  { href: "/account", label: "Account" },
];

export default function AppNav({ current }) {
  return (
    <nav className="app-nav" aria-label="Main">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.href === current ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
