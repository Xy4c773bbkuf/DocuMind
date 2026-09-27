# System design

Insightly is a stateless JWT API plus a Vite SPA and relational database. Upload validation and local extraction happen before a transaction commits derived summary/keywords, preventing partial records. Every query is owner-scoped.

Production follow-ups include object storage, antivirus scanning, rate limits, background extraction jobs, structured observability, full-text/vector indexes, and cursor pagination at larger scale. SQLite is suitable for development; PostgreSQL is the intended production database.
