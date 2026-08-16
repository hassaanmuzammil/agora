# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import feedback
from backend.app.api import auth, files, groups, threads


app = FastAPI(
    title="Chat API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    # Cloudflare quick tunnels (`cloudflared tunnel --url ...`) mint a new
    # random *.trycloudflare.com subdomain every run — match the pattern
    # instead of hardcoding one, so demo redeploys never need a CORS update.
    allow_origin_regex=r"https://.*\.trycloudflare\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Routers
app.include_router(auth.router)
app.include_router(files.router)
app.include_router(groups.router)
app.include_router(threads.router)
app.include_router(feedback.router)


@app.get("/health")
async def health():
    return {
        "status": "ok"
    }