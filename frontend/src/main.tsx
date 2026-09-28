import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Search,
  UploadCloud,
  Sparkles,
  Menu,
  X,
  Clock3,
  Tag,
} from "lucide-react";
import "./index.css";
import MvpApp, { FullDocumentRoute } from "./Workspace";

const API = import.meta.env.VITE_API_URL || "/api";
type Doc = {
  id: number;
  title: string;
  filename: string;
  file_type?: string;
  summary: string;
  content: string;
  word_count: number;
  reading_time_minutes: number;
  status: string;
  created_at: string;
  tags: { name: string }[];
  keywords: { term: string; score: number }[];
};
async function api(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers: any = { ...(init.headers || {}) };
  if (!(init.body instanceof FormData) && !headers["Content-Type"])
    headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(API + path, { ...init, headers });
  if (!r.ok)
    throw new Error(
      (await r.json().catch(() => ({}))).detail || "Request failed",
    );
  return r.status === 204 ? null : r.json();
}

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const logout = () => {
    localStorage.clear();
    nav("/login");
  };
  return (
    <div className="min-h-screen flex">
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} fixed z-20 inset-y-0 left-0 w-64 bg-white border-r p-5 transition-transform lg:translate-x-0 lg:static`}
      >
        <div className="flex items-center gap-2 text-xl font-black mb-10">
          <span className="bg-brand text-white rounded-xl p-2">
            <Sparkles size={19} />
          </span>
          Insightly
        </div>
        <nav className="space-y-2">
          <Link
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 text-muted"
            to="/"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <Link
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 text-muted"
            to="/documents"
          >
            <FileText size={18} />
            Documents
          </Link>
        </nav>
        <button
          onClick={logout}
          className="absolute bottom-6 flex items-center gap-3 text-muted p-3"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="h-16 bg-white/80 border-b flex items-center px-5 lg:px-10">
          <button className="lg:hidden mr-4" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
          <div className="text-sm text-muted">
            Your intelligent document workspace
          </div>
        </header>
        <div className="p-5 lg:p-10 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

function Login() {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = async (e: any) => {
    e.preventDefault();
    try {
      const d = register
        ? await api("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          })
        : await api("/auth/login", {
          method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ username: email, password }),
          });
      localStorage.setItem("token", d.access_token);
      window.location.assign("/");
    } catch (err: any) {
      alert(err.message);
    }
  };
  return (
    <div className="auth-screen">
      <div className="auth-aside">
        <div className="wordmark">DOCUMIND<span>.</span></div>
        <div>
          <p className="eyebrow">A PRIVATE DOCUMENT LIBRARY</p>
          <h1>Read clearly.<br /><em>Return often.</em></h1>
          <p>Extract the useful parts of your documents and keep them close at hand.</p>
        </div>
        <p className="auth-foot">LOCAL FIRST / AI OPTIONAL</p>
      </div>
      <div className="auth-form-wrap">
        <form onSubmit={submit} className="auth-form">
          <p className="eyebrow">{register ? "NEW READER" : "WELCOME BACK"}</p>
          <div className="auth-title">
            {register ? "Create your workspace" : "Welcome back"}
          </div>
          <p className="auth-copy">
            {register
              ? "Start organizing your knowledge today."
              : "Sign in to continue to your documents."}
          </p>
          <label>Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
          />
          <label>Password</label>
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="Your password"
          />
          <button className="auth-submit">
            {register ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => setRegister(!register)}
            className="auth-switch"
          >
            {register
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Reveal({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.classList.add("is-visible");
        observer.disconnect();
      }
    }, { threshold: 0.16 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} id={id} className={`reveal ${className}`}>{children}</div>;
}

function Landing({ authenticated = false }: { authenticated?: boolean }) {
  const [recentDocs, setRecentDocs] = useState<Doc[]>([]);
  const [accountStats, setAccountStats] = useState({ documents: 0, words: 0, themes: 0 });
  useEffect(() => {
    if (!authenticated) return;
    void api("/documents?page_size=3").then((data) => setRecentDocs(data.items)).catch(() => undefined);
    void api("/documents/stats").then(setAccountStats).catch(() => undefined);
  }, [authenticated]);
  const recentReading = authenticated && recentDocs.length > 0;
  return <div className="landing">
    <header className="landing-nav"><Link className="wordmark" to="/">DOCUMIND<span>.</span></Link><nav><a href="#method">METHOD</a><a href="#library">LIBRARY</a><Link className="landing-login" to={authenticated ? "/documents" : "/login"}>{authenticated ? "OPEN LIBRARY" : "SIGN IN"}</Link>{authenticated && <button className="landing-signout" onClick={() => { localStorage.clear(); location.href = "/login"; }}>SIGN OUT</button>}</nav></header>
    <main>
      <section className="landing-hero">
        <div className="hero-copy"><p className="eyebrow">A PRIVATE DOCUMENT LIBRARY / 2026</p><h1>Read clearly.<br /><em>Return often.</em></h1><p className="hero-lede">DocuMind turns the documents you already have into a working library of titles, themes, tags, and searchable text.</p><div className="hero-actions"><Link className="landing-primary" to={authenticated ? "/documents" : "/login"}>{authenticated ? "OPEN YOUR LIBRARY" : "ENTER YOUR LIBRARY"} <span>↗</span></Link><a className="landing-secondary" href="#method">SEE HOW IT WORKS</a></div></div>
        {recentReading ? <div className="hero-specimen account-specimen" aria-label="Recent reading for your account"><div className="specimen-top"><span>YOUR LIBRARY</span><span>{accountStats.documents} DOCUMENTS</span></div><div className="specimen-title">Recent reading</div>{recentDocs.map((document, index) => <Link className="specimen-row" to="/documents" key={document.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{document.title}</strong><small>{document.file_type?.toUpperCase() || "FILE"} · {document.word_count.toLocaleString()} WORDS</small><b>↗</b></Link>)}<div className="specimen-footer"><span>{accountStats.words.toLocaleString()} WORDS / {accountStats.themes} THEMES</span><span>ACCOUNT ONLY</span></div></div> : <div className="hero-private-note"><span>YOUR READING SPACE</span><p>{authenticated ? "Upload your first document and your recent reading will appear here." : "Sign in to see your own recent reading here."}</p></div>}
      </section>
      <Reveal className="landing-statement"><p className="eyebrow">THE WORKING PRINCIPLE / 01</p><h2>Make the useful parts<br /><em>easy to find.</em></h2><p>Documents arrive as files. DocuMind gives them a title, a readable shape, a set of themes, and a place in your own system.</p></Reveal>
      <section id="method" className="method-section"><div className="section-marker"><span>METHOD</span><span>01 / 03</span></div><Reveal className="method-row"><div className="method-number">01</div><div><h3>Bring it in.</h3><p>Upload a text file, PDF, or DOCX. The original stays attached to your account while its text becomes available to search.</p></div><div className="method-art text-art">TXT<br /><span>PDF / DOCX</span></div></Reveal><Reveal className="method-row"><div className="method-number">02</div><div><h3>Give it shape.</h3><p>Local extraction calculates the title, word count, reading time, and recurring keyword themes without requiring an AI service.</p></div><div className="method-art number-art">384<br /><span>WORDS</span></div></Reveal><Reveal className="method-row"><div className="method-number">03</div><div><h3>Find it again.</h3><p>Search across document words and extracted themes. Add your own tags, filter the library, and open the source text when context matters.</p></div><div className="method-art search-art">SEARCH<br /><span>WORDS + THEMES</span></div></Reveal></section>
      <Reveal className="library-section" id="library"><div><p className="eyebrow">THE LIBRARY / 02</p><h2>A calmer way to<br /><em>keep context.</em></h2></div><div className="library-note"><p>Every document keeps its original file, extracted text, summary, themes, and tags together. The result is small enough to scan and deep enough to return to.</p><Link to={authenticated ? "/documents" : "/login"}>{authenticated ? "OPEN YOUR LIBRARY" : "OPEN DOCUMIND"} <span>↗</span></Link></div></Reveal>
    </main>
    <footer className="landing-footer"><span>DOCUMIND.</span><span>LOCAL FIRST / AI OPTIONAL</span><Link to={authenticated ? "/documents" : "/login"}>{authenticated ? "OPEN LIBRARY" : "SIGN IN"}</Link></footer>
  </div>;
}

function Dashboard() {
  const [docs, setDocs] = useState<Doc[]>([]);
  useEffect(() => {
    api("/documents")
      .then((d) => setDocs(d.items))
      .catch(() => {});
  }, []);
  const words = docs.reduce((s, d) => s + d.word_count, 0);
  return (
    <Shell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-brand font-bold text-sm">OVERVIEW</p>
          <h1 className="text-3xl font-black mt-1">Good morning 👋</h1>
          <p className="text-muted mt-2">
            Here’s what’s happening in your knowledge base.
          </p>
        </div>
        <Link
          to="/documents"
          className="bg-brand text-white rounded-xl px-5 py-3 font-bold flex items-center gap-2"
        >
          <UploadCloud size={18} />
          Upload document
        </Link>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Stat icon={<FileText />} label="Documents" value={docs.length} />
        <Stat
          icon={<Clock3 />}
          label="Words analyzed"
          value={words.toLocaleString()}
        />
        <Stat
          icon={<Tag />}
          label="Key themes"
          value={
            [...new Set(docs.flatMap((d) => d.keywords.map((k) => k.term)))]
              .length
          }
        />
      </div>
      <section className="bg-white rounded-2xl border p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-lg">Recent documents</h2>
          <Link to="/documents" className="text-brand text-sm font-semibold">
            View all
          </Link>
        </div>
        {docs.length ? (
          <div className="divide-y">
            {docs.slice(0, 5).map((d) => (
              <DocRow key={d.id} d={d} />
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </section>
    </Shell>
  );
}
function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-white border rounded-2xl p-5">
      <div className="text-brand mb-4">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-sm text-muted mt-1">{label}</div>
    </div>
  );
}
function DocRow({ d }: { d: Doc }) {
  return (
    <Link
      to={`/documents/${d.id}`}
      className="flex items-center gap-4 py-4 hover:bg-surface"
    >
      <div className="bg-purple-50 text-brand p-3 rounded-xl">
        <FileText size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">{d.title}</div>
        <div className="text-sm text-muted truncate">{d.summary}</div>
      </div>
      <div className="text-xs text-muted hidden sm:block">
        {d.word_count.toLocaleString()} words
      </div>
    </Link>
  );
}
function Empty() {
  return (
    <div className="text-center py-14 text-muted">
      <FileText className="mx-auto mb-3 opacity-40" size={40} />
      <p>No documents yet. Upload your first document to get started.</p>
    </div>
  );
}
function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const load = () =>
    api(`/documents${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((d) => setDocs(d.items))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const upload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    await api("/documents", { method: "POST", body: fd });
    load();
  };
  return (
    <Shell>
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
        <div>
          <p className="text-brand font-bold text-sm">LIBRARY</p>
          <h1 className="text-3xl font-black mt-1">Documents</h1>
          <p className="text-muted mt-2">
            Search and explore your uploaded knowledge.
          </p>
        </div>
        <label className="cursor-pointer bg-brand text-white rounded-xl px-5 py-3 font-bold flex items-center gap-2">
          <UploadCloud size={18} />
          Upload
          <input
            type="file"
            accept=".txt,.md,.pdf,.docx"
            onChange={upload}
            className="hidden"
          />
        </label>
      </div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3.5 text-muted" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search documents, summaries, keywords..."
          className="w-full bg-white border rounded-xl p-3 pl-10 outline-brand"
        />
      </div>
      {docs.length ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {docs.map((d) => (
            <Link
              to={`/documents/${d.id}`}
              key={d.id}
              className="bg-white border rounded-2xl p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between">
                <div className="bg-purple-50 text-brand p-3 rounded-xl">
                  <FileText size={20} />
                </div>
                <span className="text-xs text-muted">
                  {d.word_count.toLocaleString()} words
                </span>
              </div>
              <h3 className="font-bold mt-5 truncate">{d.title}</h3>
              <p className="text-sm text-muted mt-2 line-clamp-3">
                {d.summary}
              </p>
              <div className="flex gap-2 flex-wrap mt-4">
                {d.keywords.slice(0, 3).map((k) => (
                  <span
                    className="text-xs bg-surface rounded-full px-2 py-1"
                    key={k.term}
                  >
                    #{k.term}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border">
          <Empty />
        </div>
      )}
    </Shell>
  );
}
function Detail({ id }: { id: string }) {
  const [d, setD] = useState<Doc | null>(null);
  useEffect(() => {
    api(`/documents/${id}`).then(setD);
  }, [id]);
  if (!d)
    return (
      <Shell>
        <p>Loading…</p>
      </Shell>
    );
  return (
    <Shell>
      <Link to="/documents" className="text-brand text-sm font-semibold">
        ← Back to documents
      </Link>
      <div className="mt-6 bg-white border rounded-2xl p-6 lg:p-10">
        <div className="flex gap-4 items-start">
          <div className="bg-purple-50 text-brand p-3 rounded-xl">
            <FileText />
          </div>
          <div>
            <h1 className="text-3xl font-black">{d.title}</h1>
            <p className="text-muted mt-1">
              {d.filename} · {d.word_count.toLocaleString()} words ·{" "}
              {d.reading_time_minutes} min read
            </p>
          </div>
        </div>
        <hr className="my-8" />
        <h2 className="font-bold text-lg mb-3">Summary</h2>
        <p className="text-muted leading-7 max-w-3xl">{d.summary}</p>
        <h2 className="font-bold text-lg mt-8 mb-3">Key themes</h2>
        <div className="flex flex-wrap gap-2">
          {d.keywords.map((k) => (
            <span
              key={k.term}
              className="px-3 py-2 rounded-xl bg-purple-50 text-brand text-sm font-semibold"
            >
              {k.term} <span className="opacity-60">×{k.score}</span>
            </span>
          ))}
        </div>
        <h2 className="font-bold text-lg mt-8 mb-3">Extracted text</h2>
        <pre className="whitespace-pre-wrap text-sm leading-7 bg-surface rounded-xl p-5 max-h-[32rem] overflow-auto">
          {d.content}
        </pre>
      </div>
    </Shell>
  );
}
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/documents/:id/read" element={<FullDocumentRoute id={location.pathname.split("/")[2]} />} />
      <Route
        path="/"
        element={
          localStorage.getItem("token") ? (
            <Landing authenticated />
          ) : (
            <Landing />
          )
        }
      />
      <Route
        path="/documents"
        element={
          <MvpApp
            onLogout={() => {
              localStorage.clear();
              location.href = "/login";
            }}
          />
        }
      />
      <Route
        path="/upload"
        element={
          <MvpApp
            onLogout={() => {
              localStorage.clear();
              location.href = "/login";
            }}
          />
        }
      />
      <Route
        path="/documents/:id"
        element={
          <MvpApp
            onLogout={() => {
              localStorage.clear();
              location.href = "/login";
            }}
          />
        }
      />
    </Routes>
  );
}
function DetailRoute() {
  const id = location.pathname.split("/").pop()!;
  return <Detail id={id} />;
}
function Root() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
createRoot(document.getElementById("root")!).render(<Root />);
