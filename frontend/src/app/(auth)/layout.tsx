import { Brand } from '@/components/layout/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center border-b bg-card px-6">
        <Brand link={false} />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HelpDesk Lite · Internal use only
      </footer>
    </div>
  );
}