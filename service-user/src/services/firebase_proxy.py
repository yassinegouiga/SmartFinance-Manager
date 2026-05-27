"""
Proxy Pattern — caches decoded Firebase tokens to avoid a network round-trip
to the Firebase API on every authenticated request.

A fresh call to auth.verify_id_token() is only made when:
  - The token is not in the cache, or
  - The cached entry has expired (60 s before the token's own 'exp' claim).
"""

import time
import logging
from firebase_admin import auth

logger = logging.getLogger("user-service.security")


class FirebaseAuthProxy:
    def __init__(self):
        self._cache: dict[str, tuple[dict, float]] = {}

    def verify_id_token(self, token: str, clock_skew_seconds: int = 30) -> dict:
        now = time.time()

        if token in self._cache:
            decoded, expires_at = self._cache[token]
            if now < expires_at:
                logger.debug("Token cache hit — skipping Firebase call.")
                return decoded

        decoded = auth.verify_id_token(token, clock_skew_seconds=clock_skew_seconds)

        exp = decoded.get("exp", now + 3600)
        self._cache[token] = (decoded, exp - 60)   # expire 60 s early for safety

        self._evict_expired(now)
        return decoded

    def _evict_expired(self, now: float) -> None:
        expired = [t for t, (_, exp) in self._cache.items() if now > exp]
        for t in expired:
            del self._cache[t]


firebase_auth_proxy = FirebaseAuthProxy()
