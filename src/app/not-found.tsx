import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col px-6 py-24">
      <p className="text-sm font-semibold tracking-[0.16em] text-accent uppercase">404</p>
      <h1 className="font-display mt-4 text-4xl text-ink sm:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-md text-muted">This address is not part of SUPPLY MASTERS.</p>
      <Link
        href="/"
        className="mt-8 w-fit text-sm font-semibold text-ink underline decoration-line underline-offset-4"
      >
        Return home
      </Link>
    </section>
  );
}
