import { useEffect, useState } from "react";
import { Download, FileText, MessageCircle, RefreshCw, Search, Tag, Trash2, UploadCloud } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
type Keyword = { term: string; score: number };
type Document = { id: number; title: string; filename: string; content: string; summary: string; word_count: number; reading_time_minutes: number; tags: { id?: number; name: string }[]; keywords: Keyword[]; };

type Props = { onLogout: () => void };
async function request(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}) };
  if (!(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API + path, { ...init, headers });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Request failed");
  return response.status === 204 ? null : response.json();
}

export default function MvpApp({ onLogout }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tagText, setTagText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (search = query) => {
    setLoading(true);
    try { const data = await request(`/documents${search ? `?q=${encodeURIComponent(search)}` : ""}`); setDocuments(data.items); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load documents"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(""); }, []);
  useEffect(() => {
    const download = async (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor?.href.includes("/file")) return;
      event.preventDefault();
      const response = await fetch(anchor.href, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (!response.ok) { setMessage("Unable to download the original file"); return; }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = selected?.filename || "document";
      link.click();
      URL.revokeObjectURL(url);
    };
    document.addEventListener("click", download);
    return () => document.removeEventListener("click", download);
  }, [selected?.filename]);

  const upload = async (file: File) => {
    const form = new FormData(); form.append("file", file); setMessage("Analyzing document...");
    try { const doc = await request("/documents", { method: "POST", body: form }); setDocuments((items) => [doc, ...items]); setSelected(doc); setMessage("Document ready"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed"); }
  };
  const refreshSummary = async () => { if (!selected) return; const result = await request(`/documents/${selected.id}/summary`, { method: "POST" }); setMessage(result.ai_enabled ? "Gemini summary refreshed" : "Using deterministic summary"); setSelected({ ...selected, summary: result.summary }); };
  const ask = async () => { if (!selected || !question.trim()) return; setAnswer("Thinking..."); const result = await request(`/documents/${selected.id}/ask`, { method: "POST", body: JSON.stringify({ question }) }); setAnswer(result.answer); };
  const addTags = async () => { if (!selected || !tagText.trim()) return; const tags = await request(`/documents/${selected.id}/tags`, { method: "POST", body: JSON.stringify(tagText.split(",")) }); setSelected({ ...selected, tags }); setTagText(""); };
  const remove = async () => { if (!selected || !confirm("Delete this document and its stored file?")) return; await request(`/documents/${selected.id}`, { method: "DELETE" }); setDocuments(documents.filter((doc) => doc.id !== selected.id)); setSelected(null); setMessage("Document deleted"); };

  return <div className="min-h-screen bg-surface text-ink">
    <header className="border-b bg-white px-5 py-4"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><div className="text-xl font-black text-brand">Insightly</div><div className="text-xs text-muted">Local document intelligence</div></div><button onClick={onLogout} className="text-sm font-semibold text-muted">Sign out</button></div></header>
    <main className="mx-auto grid max-w-7xl gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:p-10">
      <section><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-brand">YOUR LIBRARY</p><h1 className="mt-1 text-3xl font-black">Documents</h1><p className="mt-2 text-muted">Upload text-based files and turn them into searchable insight.</p></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white"><UploadCloud size={18}/>Upload<input className="hidden" type="file" accept=".txt,.md,.pdf,.docx" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])}/></label></div>
        <div className="relative mb-5"><Search className="absolute left-3 top-3.5 text-muted" size={18}/><input className="w-full rounded-xl border bg-white p-3 pl-10 outline-brand" placeholder="Search title, text, or summary" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()}/></div>
        {message && <div className="mb-4 rounded-xl border border-brand/20 bg-white p-3 text-sm text-brand">{message}</div>}
        {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-muted">Loading documents...</div> : <div className="grid gap-4 md:grid-cols-2">{documents.map((doc) => <button key={doc.id} onClick={() => { setSelected(doc); setAnswer(""); }} className={`rounded-2xl border bg-white p-5 text-left transition hover:shadow-lg ${selected?.id === doc.id ? "border-brand ring-2 ring-brand/10" : ""}`}><div className="flex items-start justify-between"><span className="rounded-xl bg-purple-50 p-3 text-brand"><FileText size={20}/></span><span className="text-xs text-muted">{doc.word_count.toLocaleString()} words</span></div><h2 className="mt-5 truncate font-bold">{doc.title}</h2><p className="mt-2 line-clamp-3 text-sm text-muted">{doc.summary}</p><div className="mt-4 flex flex-wrap gap-2">{doc.keywords.slice(0, 4).map((keyword) => <span key={keyword.term} className="rounded-full bg-surface px-2 py-1 text-xs">#{keyword.term}</span>)}</div></button>)}</div>}
      </section>
      <aside className="h-fit rounded-2xl border bg-white p-6 lg:sticky lg:top-6">{selected ? <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand">Selected document</p><h2 className="mt-1 text-2xl font-black">{selected.title}</h2><p className="mt-1 text-sm text-muted">{selected.filename} · {selected.reading_time_minutes} min read</p></div><button title="Delete document" onClick={() => void remove()} className="text-muted hover:text-red-600"><Trash2 size={18}/></button></div><div className="my-6 border-t pt-6"><div className="mb-2 flex items-center justify-between"><h3 className="font-bold">Summary</h3><button title="Refresh with Gemini" onClick={() => void refreshSummary()} className="text-brand"><RefreshCw size={17}/></button></div><p className="text-sm leading-6 text-muted">{selected.summary}</p></div><div className="mb-6"><h3 className="mb-2 font-bold">User tags</h3><div className="mb-3 flex flex-wrap gap-2">{selected.tags.map((tag) => <span key={tag.name} className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{tag.name}</span>)}</div><div className="flex gap-2"><input className="min-w-0 flex-1 rounded-lg border p-2 text-sm" placeholder="research, finance" value={tagText} onChange={(event) => setTagText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void addTags()}/><button onClick={() => void addTags()} className="rounded-lg bg-ink px-3 text-sm font-bold text-white"><Tag size={15}/></button></div></div><div className="mb-6"><h3 className="mb-2 flex items-center gap-2 font-bold"><MessageCircle size={17}/>Ask Gemini</h3><textarea className="mb-2 min-h-20 w-full rounded-lg border p-2 text-sm" placeholder="What is this document about?" value={question} onChange={(event) => setQuestion(event.target.value)}/><button onClick={() => void ask()} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">Ask question</button>{answer && <p className="mt-3 rounded-lg bg-surface p-3 text-sm leading-6">{answer}</p>}</div><a className="flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold text-brand" href={`${API}/documents/${selected.id}/file`} target="_blank" rel="noreferrer"><Download size={17}/>Download original file</a><details className="mt-6"><summary className="cursor-pointer text-sm font-bold">View extracted text</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-3 text-xs leading-5">{selected.content}</pre></details></> : <div className="py-12 text-center text-muted"><FileText className="mx-auto mb-3 opacity-40" size={42}/><p className="font-semibold">Select a document</p><p className="mt-1 text-sm">Upload a file to start extracting insight.</p></div>}</aside>
    </main>
  </div>;
}
