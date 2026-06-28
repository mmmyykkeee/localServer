import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-neutral-100 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="https://michaelsoft.co.ke/favicon.png"
              alt="MichaelSoft"
              width={24}
              height={24}
              className="rounded"
              unoptimized
            />
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">MichaelSoft</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/leads"
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200"
            >
              Leads
            </Link>
            <Link
              href="/analytics"
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200"
            >
              Analytics
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image
              src="https://michaelsoft.co.ke/favicon.png"
              alt="MichaelSoft"
              width={48}
              height={48}
              className="rounded-xl shadow-sm dark:shadow-neutral-900"
              unoptimized
            />
            <span className="text-2xl font-semibold text-neutral-400 dark:text-neutral-500">—</span>
            <span className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              MichaelSoft
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 leading-tight">
            Smart lead management
            <br />
            <span className="text-neutral-400 dark:text-neutral-500">powered by AI</span>
          </h1>
          <p className="mt-5 text-neutral-500 dark:text-neutral-400 text-base leading-relaxed max-w-2xl mx-auto">
            Collect and organize your potential clients&apos; contacts from websites, emails, and phone numbers.
            Enrich every lead with live website data, and generate personalized cold emails with AI — all in one place.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/leads"
              className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.97] transition-all duration-200"
            >
              Get started
            </Link>
            <Link
              href="/leads"
              className="px-5 py-2.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-neutral-300 dark:hover:border-neutral-600 active:scale-[0.97] transition-all duration-200"
            >
              View leads
            </Link>
          </div>
          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-3 gap-12 text-left max-w-3xl mx-auto">
            {[
              { title: "Auto-enrich", desc: "Paste a website and get emails, phones & social links instantly" },
              { title: "AI Emails", desc: "Generate personalized cold emails with one click" },
              { title: "Smart search", desc: "Find any lead by name, company, email, or website" },
            ].map((f) => (
              <div key={f.title}>
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-1.5">{f.title}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-100 dark:border-neutral-800 py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
          <a
            href="https://michaelsoft.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200"
          >
            MichaelSoft
          </a>
          <span>© {new Date().getFullYear()} MichaelSoft. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
