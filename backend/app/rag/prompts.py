from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"

QUERY_REWRITE_TEMPLATE = (TEMPLATES_DIR / "query_rewrite.txt").read_text()
FINAL_ANSWER_TEMPLATE = (TEMPLATES_DIR / "final_answer.txt").read_text()
