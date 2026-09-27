import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api";
type Keyword = { term: string; score: number };
type Tag = { id?: number; name: string };
type Document = { id: number; title: string; filename: string; file_type?: string; content: string; summary: string; word_count: number; reading_time_minutes: number; tags: Tag[]; keywords: Keyword[] };
type Stats = { documents: number; words: number; reading_minutes: number; themes: number };

async function request(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { ...((init.headers as Record<string, string>) || {}) };
  if (!(init.body instanceof FormData) && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API + path, { ...init, headers });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Request failed");
  return response.status === 204 ? null : response.json();
}

export default function Workspace({ onLogout }: { onLogout: () => void }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [stats, setStats] = useState<Stats>({ documents: 0, words: 0, reading_minutes: 0, themes: 0 });
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [fileType, setFileType] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tagText, setTagText] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);

  const refresh = async (search = query, tag = tagFilter, type = fileType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (tag) params.set("tag", tag);
      if (type) params.set("file_type", type);
      const data = await request(`/documents${params.toString() ? `?${params}` : ""}`);
      setDocuments(data.items);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load documents"); }
    finally { setLoading(false); }
  };
  const refreshStats = () => void request("/documents/stats").then(setStats).catch(() => undefined);
  useEffect(() => { void refresh("", "", ""); refreshStats(); void request("/tags").then(setTags).catch(() => undefined); }, []);

  const upload = async (file: File) => {
    const form = new FormData(); form.append("file", file); setMessage("Reading document...");
    try { const document = await request("/documents", { method: "POST", body: form }); setDocuments((items) => [document, ...items]); setSelected(document); setDetailOpen(true); refreshStats(); setMessage("Document added to your library"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed"); }
  };
  const addTags = async () => {
    if (!selected || !tagText.trim()) return;
    const nextTags = await request(`/documents/${selected.id}/tags`, { method: "POST", body: JSON.stringify(tagText.split(",")) });
    setSelected({ ...selected, tags: nextTags }); setTags((items) => [...items, ...nextTags.filter((tag: Tag) => !items.some((item) => item.name === tag.name))]); setTagText("");
  };
  const ask = async () => { if (!selected || !question.trim()) return; setAnswer("Working..."); const result = await request(`/documents/${selected.id}/ask`, { method: "POST", body: JSON.stringify({ question }) }); setAnswer(result.answer); };
  const remove = async () => { if (!selected || !confirm("Delete this document and its stored file?")) return; await request(`/documents/${selected.id}`, { method: "DELETE" }); setDocuments((items) => items.filter((item) => item.id !== selected.id)); setSelected(null); setDetailOpen(false); refreshStats(); };
  const download = async () => {
    if (!selected) return;
    const response = await fetch(`${API}/documents/${selected.id}/file`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    if (!response.ok) { setMessage("Could not download the file"); return; }
    const link = document.createElement("a"); link.href = URL.createObjectURL(await response.blob()); link.download = selected.filename; link.click();
  };

  return <div className="workspace">
    <header className="topbar"><a className="wordmark" href="/">DOCUMIND<span>.</span></a><nav><span>DOCUMENTS</span><button onClick={onLogout}>SIGN OUT</button></nav></header>
    <main className="workspace-main">
      <section className="intro"><div><p className="eyebrow">DOCUMENT INSIGHT DASHBOARD / 01</p><h1>A clear view of<br /><em>what you read.</em></h1><p className="intro-copy">A private working library for extracting, organising, and returning to the information inside your documents.</p></div><label className="upload-button">ADD DOCUMENT<input type="file" accept=".txt,.md,.pdf,.docx" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} /></label></section>
      <section className="stat-line" aria-label="Library statistics"><div><strong>{stats.documents}</strong><span>DOCUMENTS</span></div><div><strong>{stats.words.toLocaleString()}</strong><span>WORDS EXTRACTED</span></div><div><strong>{stats.themes}</strong><span>KEYWORD THEMES</span></div><div><strong>{stats.reading_minutes}<small>m</small></strong><span>READING TIME</span></div></section>
      <section className="library-layout">
        <div className={detailOpen ? "library hidden-on-mobile" : "library"}>
          <div className="library-heading"><div><p className="eyebrow">YOUR LIBRARY / {documents.length.toString().padStart(2, "0")}</p><h2>Documents</h2></div><p className="section-note">Search across extracted text<br />and keyword themes.</p></div>
          <div className="search-row"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void refresh()} placeholder="Search words or keywords" aria-label="Search words or keywords" /><button onClick={() => void refresh()}>SEARCH</button></div>
          <div className="filter-row"><select value={tagFilter} onChange={(event) => { setTagFilter(event.target.value); void refresh(query, event.target.value, fileType); }}><option value="">ALL TAGS</option>{tags.map((tag) => <option key={tag.name} value={tag.name}>{tag.name.toUpperCase()}</option>)}</select><select value={fileType} onChange={(event) => { setFileType(event.target.value); void refresh(query, tagFilter, event.target.value); }}><option value="">ALL FORMATS</option><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="txt">TXT</option><option value="md">MARKDOWN</option></select><button onClick={() => { setQuery(""); setTagFilter(""); setFileType(""); void refresh("", "", ""); }}>RESET</button></div>
          {message && <p className="notice">{message}</p>}
          {loading ? <div className="loading-list"><div /><div /><div /></div> : documents.length ? <div className="document-list">{documents.map((document, index) => <button className={`document-row ${selected?.id === document.id ? "selected" : ""}`} key={document.id} onClick={() => { setSelected(document); setDetailOpen(true); setAnswer(""); }}><span className="row-number">{String(index + 1).padStart(2, "0")}</span><span className="row-body"><strong>{document.title}</strong><span>{document.summary}</span><small>{document.filename} / {document.word_count.toLocaleString()} WORDS</small></span><span className="row-keywords">{document.keywords.slice(0, 2).map((keyword) => `#${keyword.term}`).join("  ")}</span><span className="row-arrow">↗</span></button>)}</div> : <div className="empty-state"><strong>Your library is empty.</strong><span>Add a text, PDF, or DOCX document to begin.</span></div>}
        </div>
        <aside className={`detail ${detailOpen ? "detail-open" : ""}`}>{selected ? <><button className="back-button" onClick={() => setDetailOpen(false)}>← BACK TO LIBRARY</button><div className="detail-kicker">DOCUMENT / {String(selected.id).padStart(2, "0")}</div><h2>{selected.title}</h2><p className="detail-file">{selected.filename} / {selected.file_type?.toUpperCase() || "FILE"}</p><div className="detail-stats"><div><strong>{selected.word_count.toLocaleString()}</strong><span>WORDS</span></div><div><strong>{selected.reading_time_minutes} MIN</strong><span>READING TIME</span></div><div><strong>{selected.keywords.length}</strong><span>KEYWORDS</span></div><div><strong>{selected.tags.length}</strong><span>TAGS</span></div></div><section className="detail-section"><h3>SUMMARY</h3><p>{selected.summary}</p></section><section className="detail-section"><h3>KEYWORD THEMES</h3><div className="keyword-list">{selected.keywords.map((keyword) => <button key={keyword.term} onClick={() => { setQuery(keyword.term); setDetailOpen(false); void refresh(keyword.term, tagFilter, fileType); }}>#{keyword.term} <small>{keyword.score}</small></button>)}</div></section><section className="detail-section"><h3>YOUR TAGS</h3><div className="tag-list">{selected.tags.map((tag) => <span key={tag.name}>{tag.name}</span>)}</div><div className="tag-entry"><input value={tagText} onChange={(event) => setTagText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void addTags()} placeholder="Add tags, separated by commas" /><button onClick={() => void addTags()}>ADD</button></div></section><section className="detail-section ask-section"><h3>ASK ABOUT THIS DOCUMENT</h3><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question when Gemini is enabled" /><button onClick={() => void ask()}>ASK GEMINI</button>{answer && <p className="answer">{answer}</p>}</section><div className="detail-actions"><button onClick={() => void download()}>DOWNLOAD ORIGINAL</button><button onClick={() => void remove()}>DELETE DOCUMENT</button></div><details className="extracted"><summary>VIEW EXTRACTED TEXT</summary><pre>{selected.content}</pre></details></> : <div className="detail-placeholder"><span>SELECT A DOCUMENT</span><p>Structured metadata, themes, tags, and extracted text will appear here.</p></div>}</aside>
      </section>
    </main>
  </div>;
}
