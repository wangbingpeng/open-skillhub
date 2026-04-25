import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { auth } from "@/lib/auth";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const user = session?.user ? {
    name: session.user.name,
    email: session.user.username,
    image: session.user.avatar,
    role: session.user.role,
  } : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={isLoggedIn} user={user} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
