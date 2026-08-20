class LLMCallError(Exception):
    """Anything that means we didn't get usable text back — refusal, API
    error, or an empty response. app/stages/decide.py treats this the same
    as a schema-validation failure: one retry, then the deterministic
    fallback."""
