import Link from "next/link";

const BENEFITS = [
  {
    title: "Use it up, don't throw it out",
    text: "List what's left in your kitchen and get a recipe built around it, so less food and money go in the trash.",
  },
  {
    title: "Amounts that fit what you have",
    text: "Only two bananas? Change one amount and the whole recipe adjusts to match.",
  },
  {
    title: "Timers built into every step",
    text: "Start a countdown right from the step you're on, no separate timer needed.",
  },
];

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Baking It Up</p>
        <h1>Bake something great with whatever's left in your kitchen.</h1>
        <p className="description">
          Baking It Up turns the last of your ingredients into a recipe you can
          actually make. It's for people who love to bake and hate wasting food,
          like college students working with half a bag of flour and two browning
          bananas.
        </p>

        <ul className="benefits">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title}>
              <h2>{benefit.title}</h2>
              <p>{benefit.text}</p>
            </li>
          ))}
        </ul>

        <p className="price">
          <strong>$20 a month.</strong> Turn what's left in your kitchen into
          your next bake. Cancel anytime.
        </p>
        <nav className="auth-links">
          <Link href="/register">Create account</Link>
          <Link href="/login">Log in</Link>
        </nav>
      </section>
      <footer className="footer">Made by Kendall Huffman</footer>
    </main>
  );
}
