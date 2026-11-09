import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Your account | Baking It Up" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="auth-page">
      <h1>Your account</h1>
      <p className="auth-switch">Logged in as {user.email}</p>
      <form action={logout} className="auth-form">
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
