# API reference

Interactive OpenAPI documentation is available at `/docs` when the API is running.

- `POST /api/auth/register` — create an account and receive a JWT.
- `POST /api/auth/login` — OAuth2 form login (`username` is email).
- `GET /api/auth/me` — current user.
- `GET /api/documents?q=&tag=&page=&page_size=` — scoped search and pagination.
- `POST /api/documents` — multipart upload (`txt`, `md`, `pdf`, `docx`).
- `GET /api/documents/{id}` — insight detail.
- `DELETE /api/documents/{id}` — delete an owned document.
- `GET /api/tags` — list tags.

All document and tag endpoints require `Authorization: Bearer <token>`.

`GET /api/documents` supports `q`, `tag`, `file_type`, `sort`, `order`, `page`, and `page_size`. Upload rejects empty, oversized (>10 MB), invalid, corrupt, or unreadable files. `GET /api/documents/stats` returns dashboard totals. Tags are managed with `POST /api/documents/{id}/tags` and `DELETE /api/documents/{id}/tags/{tag_id}`. `POST /api/documents/{id}/ask` returns a safe disabled response when `AI_ENABLED=false`.
