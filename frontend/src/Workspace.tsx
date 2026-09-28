import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api";
type Keyword = { term: string; score: number };
type Tag = { id?: number; name: string };
type Document = { id: number; title: string; filename: string; file_type?: string; content: string; summary: string; word_count: number; reading_time_minutes: number; tags: Tag[]; keywords: Keyword[] };
type Stats = { documents: number; words: number; reading_minutes: number; themes: number };

function MindMap({ document }: { document: Document }) {
  const branches = [
    { label: "SUMMARY", value: document.summary.slice(0,  ninetyCharacters(document.summary)) },
    { label: "THEMES", value: document.keywords.slice(0, 5).map((keyword) => `#${keyword.term}`).join("  ") || "No themes extracted" },
    { label: "TAGS", value: document.tags.map((tag) => tag.name).join("  ") || "No user tags yet" },
    { label: "SOURCE", value: `${document.file_type?.toUpperCase() || "FILE"} / ${document.word_count.toLocaleString()} WORDS` },
  ];
  return <div className="mind-map" aria-label="Document mind map"><div className="mind-root">{document.title}</div><div className="mind-branches">{branches.map((branch) => <div className="mind-branch" key={branch.label}><span className="mind-line" /><div><b>{branch.label}</b><p>{branch.value}</p></div></div>)}</div></div>;
}

function ninetyCharacters(value: string) { return Math.min(value.length, 90); }

function suggestedQuestions(document: Document) {
  const theme = document.keywords[0]?.term || "main theme";
  return [`What is the main point of this document?`, `What does it say about ${theme}?`, `What should I remember from it?`];
}

function ReaderView({ document, onBack, onDelete, onDownload, onAddTags, tagText, setTagText, question, setQuestion, answer, ask }: { document: Document; onBack: () => void; onDelete: () => void; onDownload: () => void; onAddTags: () => void; tagText: string; setTagText: (value: string) => void; question: string; setQuestion: (value: string) => void; answer: string; ask: (prompt?: string) => void }) {
  const openFullDocument = () => window.open(`/documents/${document.id}/read`, "_blank", "noopener,noreferrer");
  return <div className="reader-page"><header className="topbar"><button className="reader-back" onClick={onBack}>← LIBRARY</button><a className="wordmark" href="/">DOCUMIND<span>.</span></a><nav><span>DOCUMENT PREVIEW</span></nav></header><main className="reader-main"><div className="reader-heading"><p className="eyebrow">DOCUMENT PREVIEW / {String(document.id).padStart(2, "0")}</p><h1>{document.title}</h1><p className="reader-file">{document.filename} / {document.file_type?.toUpperCase() || "FILE"} / {document.word_count.toLocaleString()} WORDS / {document.reading_time_minutes} MINUTES</p></div><div className="reader-grid"><aside className="reader-map"><p className="eyebrow">DOCUMENT MAP</p><MindMap document={document} /><div className="reader-actions"><button className="open-document" onClick={openFullDocument}>OPEN FULL DOCUMENT ↗</button><button onClick={onDownload}>DOWNLOAD ORIGINAL</button><button onClick={onDelete}>DELETE DOCUMENT</button></div></aside><section className="reader-content"><div className="reader-preview"><p className="eyebrow">AT A GLANCE</p><div className="reader-metrics"><span><b>{document.word_count.toLocaleString()}</b> WORDS</span><span><b>{document.keywords.length}</b> THEMES</span><span><b>{document.tags.length}</b> TAGS</span></div><p>{document.summary}</p></div><article className="preview-reading"><p className="eyebrow">TEXT PREVIEW</p><div className="reading-copy">{document.content.slice(0, 900)}{document.content.length > 900 ? "..." : ""}</div><button className="open-document preview-button" onClick={openFullDocument}>READ THE FULL DOCUMENT IN A NEW TAB ↗</button></article><section className="suggested-questions"><p className="eyebrow">SUGGESTED QUESTIONS</p><div>{suggestedQuestions(document).map((suggestion) => <button key={suggestion} onClick={() => void ask(suggestion)}>{suggestion} ↗</button>)}</div></section><section className="reader-tools"><div><p className="eyebrow">YOUR TAGS</p><div className="tag-list">{document.tags.map((tag) => <span key={tag.name}>{tag.name}</span>)}</div><div className="tag-entry"><input value={tagText} onChange={(event) => setTagText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAddTags()} placeholder="Add tags, separated by commas" /><button onClick={onAddTags}>ADD</button></div></div><div className="reader-ask"><p className="eyebrow">ASK ABOUT THIS DOCUMENT</p><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question when Gemini is enabled" /><button onClick={() => void ask()}>ASK GEMINI</button>{answer && <p className="answer">{answer}</p>}</div></section></section></div></main></div>;
}

function FullDocumentView({ document }: { document: Document }) {
  return <div className="reader-page full-document-page"><header className="topbar"><a className="reader-back" href={`/documents?selected=${document.id}`}>← DOCUMENT PREVIEW</a><a className="wordmark" href="/">DOCUMIND<span>.</span></a><nav><span>FULL DOCUMENT</span></nav></header><main className="full-document-main"><p className="eyebrow">FULL DOCUMENT / {document.filename}</p><h1>{document.title}</h1><p className="reader-file">{document.file_type?.toUpperCase() || "FILE"} / {document.word_count.toLocaleString()} WORDS / {document.reading_time_minutes} MINUTES</p><div className="full-reading"><p className="eyebrow">EXTRACTED TEXT</p><div className="reading-copy">{document.content}</div></div></main></div>;
}

export function FullDocumentRoute({ id }: { id: string }) {
  const [document, setDocument] = useState<Document | null>(null);
  useEffect(() => { void request(`/documents/${id}`).then(setDocument).catch(() => undefined); }, [id]);
  return document ? <FullDocumentView document={document} /> : <div className="reader-page"><main className="full-document-main"><p className="eyebrow">LOADING DOCUMENT</p></main></div>;
}

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
  const ask = async (prompt = question) => { if (!selected || !prompt.trim()) return; setQuestion(prompt); setAnswer("Working..."); const result = await request(`/documents/${selected.id}/ask`, { method: "POST", body: JSON.stringify({ question: prompt }) }); setAnswer(result.answer); };
  const remove = async () => { if (!selected || !confirm("Delete this document and its stored file?")) return; await request(`/documents/${selected.id}`, { method: "DELETE" }); setDocuments((items) => items.filter((item) => item.id !== selected.id)); setSelected(null); setDetailOpen(false); refreshStats(); };
  const download = async () => {
    if (!selected) return;
    const response = await fetch(`${API}/documents/${selected.id}/file`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    if (!response.ok) { setMessage("Could not download the file"); return; }
    const link = document.createElement("a"); link.href = URL.createObjectURL(await response.blob()); link.download = selected.filename; link.click();
  };

  if (selected && detailOpen) return <ReaderView document={selected} onBack={() => setDetailOpen(false)} onDownload={() => void download()} onDelete={() => void remove()} onAddTags={() => void addTags()} tagText={tagText} setTagText={setTagText} question={question} setQuestion={setQuestion} answer={answer} ask={() => void ask()} />;

  return <div className="workspace">
    <header className="topbar"><a className="wordmark" href="/">DOCUMIND<span>.</span></a><nav><span>DOCUMENTS</span><button onClick={onLogout}>SIGN OUT</button></nav></header>
    <main className="workspace-main">
      <section className="intro"><div><p className="eyebrow">DOCUMENT INSIGHT DASHBOARD / 01</p><h1>A clear view of<br /><em>what you read.</em></h1><p className="intro-copy">A private working library for extracting, organising, and returning to the information inside your documents.</p></div><label className="upload-button">ADD DOCUMENT<input type="file" accept=".txt,.md,.pdf,.docx" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} /></label></section>
      <section className="stat-line" aria-label={selected ? "Selected document statistics" : "Library statistics"}>{selected ? <><div><strong>{selected.file_type?.toUpperCase() || "FILE"}</strong><span>FORMAT</span></div><div><strong>{selected.word_count.toLocaleString()}</strong><span>WORDS</span></div><div><strong>{selected.reading_time_minutes}<small>m</small></strong><span>READING TIME</span></div><div><strong>{selected.keywords.length}<small> / {selected.tags.length}</small></strong><span>THEMES / TAGS</span></div></> : <><div><strong>{stats.documents}</strong><span>DOCUMENTS</span></div><div><strong>{stats.words.toLocaleString()}</strong><span>WORDS EXTRACTED</span></div><div><strong>{stats.themes}</strong><span>KEYWORD THEMES</span></div><div><strong>{stats.reading_minutes}<small>m</small></strong><span>READING TIME</span></div></>}</section>
      <section className="library-layout">
        <div className={detailOpen ? "library hidden-on-mobile" : "library"}>
          <div className="library-heading"><div><p className="eyebrow">YOUR LIBRARY / {documents.length.toString().padStart(2, "0")}</p><h2>Documents</h2></div><p className="section-note">Search across extracted text<br />and keyword themes.</p></div>
          <div className="search-row"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void refresh()} placeholder="Search words or keywords" aria-label="Search words or keywords" /><button onClick={() => void refresh()}>SEARCH</button></div><p className="search-status">{query ? `${documents.length} result${documents.length === 1 ? "" : "s"} for “${query}”` : `${documents.length} document${documents.length === 1 ? "" : "s"} in this view`}</p>
          <div className="filter-row"><select value={tagFilter} onChange={(event) => { setTagFilter(event.target.value); void refresh(query, event.target.value, fileType); }}><option value="">ALL TAGS</option>{tags.map((tag) => <option key={tag.name} value={tag.name}>{tag.name.toUpperCase()}</option>)}</select><select value={fileType} onChange={(event) => { setFileType(event.target.value); void refresh(query, tagFilter, event.target.value); }}><option value="">ALL FORMATS</option><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="txt">TXT</option><option value="md">MARKDOWN</option></select><button onClick={() => { setQuery(""); setTagFilter(""); setFileType(""); void refresh("", "", ""); }}>RESET</button></div>
          {message && <p className="notice">{message}</p>}
          {loading ? <div className="loading-list"><div /><div /><div /></div> : documents.length ? <div className="document-list">{documents.map((document, index) => <button className={`document-row ${selected?.id === document.id ? "selected" : ""}`} key={document.id} onClick={() => { setSelected(document); setDetailOpen(true); setAnswer(""); }}><span className="row-number">{String(index + 1).padStart(2, "0")}</span><span className="row-body"><strong>{document.title}</strong><span>{document.summary}</span><small>{document.filename} / {document.word_count.toLocaleString()} WORDS / {document.reading_time_minutes} MIN</small></span><span className="row-insight"><span>{document.file_type?.toUpperCase() || "FILE"}</span><i><b style={{ width: `${Math.min(100, Math.max(12, document.keywords.length * 10))}%` }} /></i><small>{document.keywords.length} THEMES / {document.tags.length} TAGS</small></span><span className="row-arrow">↗</span></button>)}</div> : <div className="empty-state"><strong>Your library is empty.</strong><span>Add a text, PDF, or DOCX document to begin.</span></div>}
        </div>
        <aside className={`detail ${detailOpen ? "detail-open" : ""}`}>{selected ? <><button className="back-button" onClick={() => setDetailOpen(false)}>← BACK TO LIBRARY</button><div className="detail-kicker">DOCUMENT / {String(selected.id).padStart(2, "0")}</div><h2>{selected.title}</h2><p className="detail-file">{selected.filename} / {selected.file_type?.toUpperCase() || "FILE"}</p><div className="detail-stats"><div><strong>{selected.word_count.toLocaleString()}</strong><span>WORDS</span></div><div><strong>{selected.reading_time_minutes} MIN</strong><span>READING TIME</span></div><div><strong>{selected.keywords.length}</strong><span>KEYWORDS</span></div><div><strong>{selected.tags.length}</strong><span>TAGS</span></div></div><section className="detail-section"><h3>SUMMARY</h3><p>{selected.summary}</p></section><section className="detail-section"><h3>KEYWORD THEMES</h3><div className="keyword-list">{selected.keywords.map((keyword) => <button key={keyword.term} onClick={() => { setQuery(keyword.term); setDetailOpen(false); void refresh(keyword.term, tagFilter, fileType); }}>#{keyword.term} <small>{keyword.score}</small></button>)}</div></section><section className="detail-section"><h3>YOUR TAGS</h3><div className="tag-list">{selected.tags.map((tag) => <span key={tag.name}>{tag.name}</span>)}</div><div className="tag-entry"><input value={tagText} onChange={(event) => setTagText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void addTags()} placeholder="Add tags, separated by commas" /><button onClick={() => void addTags()}>ADD</button></div></section><section className="detail-section ask-section"><h3>ASK ABOUT THIS DOCUMENT</h3><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question when Gemini is enabled" /><button onClick={() => void ask()}>ASK GEMINI</button>{answer && <p className="answer">{answer}</p>}</section><div className="detail-actions"><button onClick={() => void download()}>DOWNLOAD ORIGINAL</button><button onClick={() => void remove()}>DELETE DOCUMENT</button></div><details className="extracted"><summary>VIEW EXTRACTED TEXT</summary><pre>{selected.content}</pre></details></> : <div className="detail-placeholder"><span>SELECT A DOCUMENT</span><p>Structured metadata, themes, tags, and extracted text will appear here.</p></div>}</aside>
      </section>
    </main>
  </div>;
}


