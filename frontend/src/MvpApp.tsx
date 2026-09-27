import { useEffect, useState } from "react";
import {
  Download,
  FileText,
  MessageCircle,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  UploadCloud,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
type Keyword = { term: string; score: number };
type Document = {
  id: number;
  title: string;
  filename: string;
  file_type?: string;
  content: string;
  summary: string;
  word_count: number;
  reading_time_minutes: number;
  tags: { id?: number; name: string }[];
  keywords: Keyword[];
};
type Stats = {
  documents: number;
  words: number;
  reading_minutes: number;
  themes: number;
};

type Props = { onLogout: () => void };
async function request(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
  };
  if (!(init.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API + path, { ...init, headers });
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => ({}))).detail || "Request failed",
    );
  return response.status === 204 ? null : response.json();
}

export default function MvpApp({ onLogout }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [fileType, setFileType] = useState("");
  const [availableTags, setAvailableTags] = useState<
    { id: number; name: string }[]
  >([]);
  const [stats, setStats] = useState<Stats>({
    documents: 0,
    words: 0,
    reading_minutes: 0,
    themes: 0,
  });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tagText, setTagText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const load = async (
    search = query,
    selectedTag = tagFilter,
    selectedFileType = fileType,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (selectedTag) params.set("tag", selectedTag);
      if (selectedFileType) params.set("file_type", selectedFileType);
      const data = await request(
        `/documents${params.toString() ? `?${params}` : ""}`,
      );
      setDocuments(data.items);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load documents",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load("", "", "");
    void request("/documents/stats")
      .then(setStats)
      .catch(() => undefined);
    void request("/tags")
      .then(setAvailableTags)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const download = async (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor?.href.includes("/file")) return;
      event.preventDefault();
      const response = await fetch(anchor.href, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) {
        setMessage("Unable to download the original file");
        return;
      }
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
    const form = new FormData();
    form.append("file", file);
    setMessage("Analyzing document...");
    try {
      const doc = await request("/documents", { method: "POST", body: form });
      setDocuments((items) => [doc, ...items]);
      setSelected(doc);
      void request("/documents/stats").then(setStats).catch(() => undefined);
      setMessage("Document ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    }
  };
  const refreshSummary = async () => {
    if (!selected) return;
    const result = await request(`/documents/${selected.id}/summary`, {
      method: "POST",
    });
    setMessage(
      result.ai_enabled
        ? "Gemini summary refreshed"
        : "Using deterministic summary",
    );
    setSelected({ ...selected, summary: result.summary });
  };
  const ask = async () => {
    if (!selected || !question.trim()) return;
    setAnswer("Thinking...");
    const result = await request(`/documents/${selected.id}/ask`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    setAnswer(result.answer);
  };
  const addTags = async () => {
    if (!selected || !tagText.trim()) return;
    const tags = await request(`/documents/${selected.id}/tags`, {
      method: "POST",
      body: JSON.stringify(tagText.split(",")),
    });
    setSelected({ ...selected, tags });
    setAvailableTags((items) => {
      const merged = [...items, ...tags.map((tag: { id: number; name: string }) => tag)];
      return merged.filter((tag, index) => merged.findIndex((item) => item.name === tag.name) === index);
    });
    setTagText("");
  };
  const remove = async () => {
    if (!selected || !confirm("Delete this document and its stored file?"))
      return;
    await request(`/documents/${selected.id}`, { method: "DELETE" });
    setDocuments(documents.filter((doc) => doc.id !== selected.id));
    void request("/documents/stats").then(setStats).catch(() => undefined);
    setSelected(null);
    setMessage("Document deleted");
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <div className="text-xl font-black text-brand">Insightly</div>
            <div className="text-xs text-muted">
              Local document intelligence
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-sm font-semibold text-muted"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-6 p-5 md:grid-cols-[minmax(0,1fr)_360px] lg:grid-cols-[minmax(0,1fr)_400px] lg:p-10">
        <section>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold text-brand">
                DOCUMENT INSIGHT DASHBOARD
              </p>
              <h1 className="mt-1 text-3xl font-black">Your knowledge base</h1>
              <p className="mt-2 text-muted">
                Upload, extract, tag, search, and explore structured document
                insight.
              </p>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white">
              <UploadCloud size={18} />
              Upload document
              <input
                className="hidden"
                type="file"
                accept=".txt,.md,.pdf,.docx"
                onChange={(event) =>
                  event.target.files?.[0] && void upload(event.target.files[0])
                }
              />
            </label>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-4">
              <p className="text-2xl font-black text-brand">
                {stats.documents}
              </p>
              <p className="text-xs font-semibold text-muted">Documents</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-2xl font-black text-brand">
                {stats.words.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-muted">
                Words extracted
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-2xl font-black text-brand">{stats.themes}</p>
              <p className="text-xs font-semibold text-muted">Keyword themes</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-2xl font-black text-brand">
                {stats.reading_minutes}m
              </p>
              <p className="text-xs font-semibold text-muted">Reading time</p>
            </div>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-3.5 text-muted" size={18} />
            <input
              className="w-full rounded-xl border bg-white p-3 pl-10 outline-brand"
              placeholder="Search titles, words, summaries, or keywords"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void load()}
            />
          </div>
          <p className="mb-3 text-xs text-muted">
            Search checks extracted document text and keyword themes. Press
            Enter to search.
          </p>
          <div className="mb-5 flex flex-wrap gap-2">
            <select
              className="rounded-lg border bg-white px-3 py-2 text-sm"
              value={tagFilter}
              onChange={(event) => {
                setTagFilter(event.target.value);
                void load(query, event.target.value, fileType);
              }}
            >
              <option value="">All tags</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border bg-white px-3 py-2 text-sm"
              value={fileType}
              onChange={(event) => {
                setFileType(event.target.value);
                void load(query, tagFilter, event.target.value);
              }}
            >
              <option value="">All file types</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="txt">TXT</option>
              <option value="md">Markdown</option>
            </select>
            {(tagFilter || fileType || query) && (
              <button
                className="rounded-lg px-3 py-2 text-sm font-semibold text-brand"
                onClick={() => {
                  setQuery("");
                  setTagFilter("");
                  setFileType("");
                  void load("", "", "");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
          {message && (
            <div className="mb-4 rounded-xl border border-brand/20 bg-white p-3 text-sm text-brand">
              {message}
            </div>
          )}
          {loading ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-muted">
              Loading documents...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelected(doc);
                    setAnswer("");
                    setDetailVisible(true);
                  }}
                  className={`rounded-2xl border bg-white p-5 text-left transition hover:shadow-lg ${selected?.id === doc.id ? "border-brand ring-2 ring-brand/10" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="rounded-xl bg-purple-50 p-3 text-brand">
                      <FileText size={20} />
                    </span>
                    <span className="text-xs text-muted">
                      {doc.word_count.toLocaleString()} words
                    </span>
                  </div>
                  <h2 className="mt-5 truncate font-bold">{doc.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted">
                    {doc.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {doc.keywords.slice(0, 4).map((keyword) => (
                      <span
                        key={keyword.term}
                        className="rounded-full bg-surface px-2 py-1 text-xs"
                      >
                        #{keyword.term}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
        <aside id="document-detail" className={`${detailVisible ? "block" : "hidden md:block"} h-fit rounded-2xl border bg-white p-6 md:sticky md:top-6`}>
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button className="mb-2 text-xs font-semibold text-brand md:hidden" onClick={() => setDetailVisible(false)}>Back to documents</button>
                  <p className="text-xs font-bold uppercase text-brand">
                    Selected document
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{selected.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {selected.filename} · {selected.file_type?.toUpperCase() || "FILE"} · {selected.word_count.toLocaleString()} words · {selected.reading_time_minutes} min read
                  </p>
                </div>
                <button
                  title="Delete document"
                  onClick={() => void remove()}
                  className="text-muted hover:text-red-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="my-6 border-t pt-6">
                <div className="mb-6 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-surface p-3">
                    <p className="text-lg font-black text-brand">{selected.word_count.toLocaleString()}</p>
                    <p className="text-xs font-semibold text-muted">Words</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="text-lg font-black text-brand">{selected.reading_time_minutes} min</p>
                    <p className="text-xs font-semibold text-muted">Reading time</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="text-lg font-black text-brand">{selected.keywords.length}</p>
                    <p className="text-xs font-semibold text-muted">Keywords</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="text-lg font-black text-brand">{selected.tags.length}</p>
                    <p className="text-xs font-semibold text-muted">Tags</p>
                  </div>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold">Summary</h3>
                  <button
                    title="Refresh with Gemini"
                    onClick={() => void refreshSummary()}
                    className="text-brand"
                  >
                    <RefreshCw size={17} />
                  </button>
                </div>
                <p className="text-sm leading-6 text-muted">
                  {selected.summary}
                </p>
              </div>
              <div className="mb-6">
                <h3 className="mb-2 font-bold">User-defined tags</h3>
                <div className="mb-3 flex flex-wrap gap-2">
                  {selected.tags.map((tag) => (
                    <span
                      key={tag.name}
                      className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border p-2 text-sm"
                    placeholder="research, finance"
                    value={tagText}
                    onChange={(event) => setTagText(event.target.value)}
                    onKeyDown={(event) =>
                      event.key === "Enter" && void addTags()
                    }
                  />
                  <button
                    onClick={() => void addTags()}
                    className="rounded-lg bg-ink px-3 text-sm font-bold text-white"
                  >
                    <Tag size={15} />
                  </button>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="mb-2 font-bold">Extracted keyword themes</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.keywords.map((keyword) => (
                    <button key={keyword.term} onClick={() => { setQuery(keyword.term); void load(keyword.term, tagFilter, fileType); }} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-brand">
                      #{keyword.term} · {keyword.score}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <h3 className="mb-2 flex items-center gap-2 font-bold">
                  <MessageCircle size={17} />
                  Ask Gemini
                </h3>
                <textarea
                  className="mb-2 min-h-20 w-full rounded-lg border p-2 text-sm"
                  placeholder="What is this document about?"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <button
                  onClick={() => void ask()}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white"
                >
                  Ask question
                </button>
                {answer && (
                  <p className="mt-3 rounded-lg bg-surface p-3 text-sm leading-6">
                    {answer}
                  </p>
                )}
              </div>
              <a
                className="flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold text-brand"
                href={`${API}/documents/${selected.id}/file`}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={17} />
                Download original file
              </a>
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-bold">
                  View extracted text
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-3 text-xs leading-5">
                  {selected.content}
                </pre>
              </details>
            </>
          ) : (
            <div className="py-12 text-center text-muted">
              <FileText className="mx-auto mb-3 opacity-40" size={42} />
              <p className="font-semibold">Select a document</p>
              <p className="mt-1 text-sm">
                Upload a file to start extracting insight.
              </p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
