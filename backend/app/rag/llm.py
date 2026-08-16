import ast

from openai import AsyncOpenAI

from backend.app.core.config import settings
from backend.app.rag.prompts import QUERY_REWRITE_TEMPLATE

openai_client = AsyncOpenAI(api_key=settings.OPENAI_KEY) if settings.OPENAI_KEY else None


def extract_json_str(text: str) -> str | None:
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        return text[start:end]
    except ValueError:
        return None


async def query_rewrite(message: str, chat_history: str) -> tuple[str | None, str]:
    """Returns (rewritten_query, fallback_message). rewritten_query is None
    when the query is unanswerable/not-a-real-question — in that case
    fallback_message is what should be shown to the user instead."""

    fallback_message = "Sorry, I can not provide a response at the moment."

    if openai_client is None:
        return None, "OpenAI API key is not configured."

    prompt = QUERY_REWRITE_TEMPLATE.format(chat_history=chat_history, message=message)

    try:
        response = await openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.choices[0].message.content or ""
        parsed = ast.literal_eval(extract_json_str(raw))
        valid = str(parsed.get("valid", "false")).lower() == "true"
        if valid:
            return parsed.get("output"), fallback_message
        return None, parsed.get("output", fallback_message)
    except Exception:
        return None, fallback_message


def build_context(sources: list[dict]) -> str:
    context = ""
    for source in sources:
        name = source.get("name", "Unknown")
        page = source.get("page", "Unknown")
        content = source.get("content")
        context += f"Source: {name}, Page: {page}\n```{content}```\n\n"
    return context
