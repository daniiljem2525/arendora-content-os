import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">A</div>
          <h1 className="text-xl font-semibold">Arendora Content OS</h1>
          <p className="mt-1 text-sm text-slate-500">AI marketing automation platform</p>
        </div>
        <div className="card">
          <LoginForm nextPath={next ?? "/dashboard"} />
        </div>
      </div>
    </main>
  );
}
