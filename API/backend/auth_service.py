import base64
import hashlib
import hmac
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any

from werkzeug.security import check_password_hash, generate_password_hash

from .config import settings

try:
    import jwt as pyjwt
except ImportError:  # pragma: no cover - optional dependency
    pyjwt = None


USERS_DB_FILE = settings.auth_users_db_file
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

PROFILE_ALIASES = {
    "admin": "administrador",
    "administrador": "administrador",
    "administrator": "administrador",
    "medico": "medico",
    "m\u00e9dico": "medico",
    "doctor": "medico",
    "recepcao": "recepcao",
    "recep\u00e7\u00e3o": "recepcao",
    "reception": "recepcao",
    "usuario": "usuario",
    "usu\u00e1rio": "usuario",
    "user": "usuario",
}

PROFILE_REDIRECTS = {
    "administrador": "/admin",
    "medico": "/medico",
    "recepcao": "/recepcao",
    "usuario": "/app",
}

PROFILE_PERMISSIONS = {
    "administrador": {
        "admin:read",
        "admin:write",
        "patients:read",
        "patients:write",
        "consultations:read",
        "consultations:write",
        "chat:use",
        "pdf:upload",
        "audio:transcribe",
        "recommendations:read",
        "profiles:select",
    },
    "medico": {
        "patients:read",
        "patients:write",
        "consultations:read",
        "consultations:write",
        "chat:use",
        "pdf:upload",
        "audio:transcribe",
        "recommendations:read",
        "profiles:select",
    },
    "recepcao": {
        "patients:read",
        "patients:write",
        "consultations:read",
        "consultations:write",
        "profiles:select",
    },
    "usuario": {
        "patients:read",
        "consultations:read",
        "profiles:select",
    },
}


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _base64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def _fallback_jwt_encode(payload: dict[str, Any], secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_part = _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_part = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_part}.{payload_part}.{_base64url_encode(signature)}"


def _fallback_jwt_decode(token: str, secret: str) -> dict[str, Any]:
    try:
        header_part, payload_part, signature_part = token.split(".")
    except ValueError as exc:
        raise AuthError("Token invalido", 401) from exc

    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    provided = _base64url_decode(signature_part)

    if not hmac.compare_digest(expected, provided):
        raise AuthError("Token invalido", 401)

    header = json.loads(_base64url_decode(header_part))
    if header.get("alg") != "HS256":
        raise AuthError("Token invalido", 401)

    payload = json.loads(_base64url_decode(payload_part))
    exp = payload.get("exp")
    if isinstance(exp, (int, float)) and _utcnow().timestamp() > exp:
        raise AuthError("Token expirado", 401)
    return payload


@lru_cache(maxsize=1)
def get_auth_secret() -> str:
    if settings.auth_secret_key:
        return settings.auth_secret_key
    raise AuthError("AUTH_SECRET_KEY nao configurado", 500)


def normalize_email(email: Any) -> str:
    if not isinstance(email, str):
        return ""
    return email.strip().lower()


def is_valid_email(email: str) -> bool:
    return bool(email and EMAIL_RE.match(email))


def normalize_profile(profile: Any) -> str:
    if not isinstance(profile, str):
        return ""
    cleaned = profile.strip().lower()
    return PROFILE_ALIASES.get(cleaned, cleaned)


def normalize_profiles(profiles: list[str] | str | None) -> list[str]:
    if isinstance(profiles, str):
        raw_profiles = [item.strip() for item in profiles.split(",")]
    elif isinstance(profiles, list):
        raw_profiles = profiles
    else:
        raw_profiles = []

    normalized: list[str] = []
    for profile in raw_profiles:
        value = normalize_profile(profile)
        if value in PROFILE_PERMISSIONS and value not in normalized:
            normalized.append(value)
    return normalized


def load_users_database() -> dict[str, Any]:
    bootstrap_users_if_needed()
    if not os.path.exists(USERS_DB_FILE):
        return {"users": []}
    try:
        with open(USERS_DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (IOError, json.JSONDecodeError):
        print(f"[AUTH] Nao foi possivel carregar {USERS_DB_FILE}. Usando base vazia.")
        return {"users": []}

    if not isinstance(data, dict) or not isinstance(data.get("users"), list):
        return {"users": []}
    return data


def save_users_database(data: dict[str, Any]) -> None:
    directory = os.path.dirname(USERS_DB_FILE)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(USERS_DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def bootstrap_users_if_needed() -> None:
    if os.path.exists(USERS_DB_FILE):
        return

    email = normalize_email(settings.auth_bootstrap_email)
    password = settings.auth_bootstrap_password
    if not email or not password:
        return

    profiles = normalize_profiles(settings.auth_bootstrap_profiles)
    if not profiles:
        profiles = ["administrador"]

    create_user(email, password, settings.auth_bootstrap_name, profiles)


def create_user(
    email: str,
    password: str,
    name: str,
    profiles: list[str],
    *,
    active: bool = True,
    extra_fields: dict[str, Any] | None = None,
) -> dict[str, Any]:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise ValueError("Email invalido")
    if not isinstance(password, str) or not password:
        raise ValueError("Senha obrigatoria")

    normalized_profiles = normalize_profiles(profiles)
    if not normalized_profiles:
        raise ValueError("Perfil invalido")

    data = {"users": []}
    if os.path.exists(USERS_DB_FILE):
        try:
            with open(USERS_DB_FILE, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict) and isinstance(loaded.get("users"), list):
                    data = loaded
        except (IOError, json.JSONDecodeError):
            data = {"users": []}

    if any(normalize_email(user.get("email")) == email for user in data["users"]):
        raise ValueError("Usuario ja existe")

    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": name or email,
        "password_hash": generate_password_hash(password),
        "profiles": normalized_profiles,
        "active": active,
        "created_at": _utcnow().isoformat(),
    }
    if extra_fields:
        user.update(extra_fields)
    data["users"].append(user)
    save_users_database(data)
    return user


def create_doctor_registration(
    *,
    name: Any,
    email: Any,
    password: Any,
    crm: Any = None,
    specialty: Any = None,
) -> dict[str, Any]:
    normalized_email = normalize_email(email)
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Nome obrigatorio")
    if not is_valid_email(normalized_email):
        raise ValueError("Email invalido")
    if not isinstance(password, str) or not password:
        raise ValueError("Senha obrigatoria")

    extra_fields = {
        "crm": crm.strip() if isinstance(crm, str) and crm.strip() else None,
        "specialty": specialty.strip() if isinstance(specialty, str) and specialty.strip() else None,
        "approval_status": "pending",
        "approved_at": None,
        "approved_by": None,
        "rejected_at": None,
        "rejected_by": None,
        "rejection_reason": None,
    }
    return create_user(
        normalized_email,
        password,
        name.strip(),
        ["medico"],
        active=False,
        extra_fields=extra_fields,
    )


def find_user_by_email(email: str) -> dict[str, Any] | None:
    email = normalize_email(email)
    for user in load_users_database().get("users", []):
        if normalize_email(user.get("email")) == email:
            return user
    return None


def find_user_by_id(user_id: str) -> dict[str, Any] | None:
    for user in load_users_database().get("users", []):
        if user.get("id") == user_id:
            return user
    return None


def sanitize_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
    }


def sanitize_doctor_request(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "profiles": normalize_profiles(user.get("profiles")),
        "active": bool(user.get("active", True)),
        "crm": user.get("crm"),
        "specialty": user.get("specialty"),
        "approval_status": get_doctor_approval_status(user),
        "created_at": user.get("created_at"),
        "approved_at": user.get("approved_at"),
        "approved_by": user.get("approved_by"),
        "rejected_at": user.get("rejected_at"),
        "rejected_by": user.get("rejected_by"),
        "rejection_reason": user.get("rejection_reason"),
    }


def get_profile_details(profile: str) -> dict[str, Any]:
    normalized = normalize_profile(profile)
    permissions = sorted(PROFILE_PERMISSIONS.get(normalized, set()))
    return {
        "name": normalized,
        "permissions": permissions,
        "redirect_to": PROFILE_REDIRECTS.get(normalized, "/app"),
    }


def authenticate_user(email: Any, password: Any, *, require_active: bool = True) -> dict[str, Any] | None:
    normalized_email = normalize_email(email)
    if not is_valid_email(normalized_email):
        return None
    if not isinstance(password, str) or not password:
        return None

    user = find_user_by_email(normalized_email)
    if not user:
        return None
    if not check_password_hash(user.get("password_hash", ""), password):
        return None
    if require_active and not user.get("active", True):
        return None
    return user


def get_doctor_approval_status(user: dict[str, Any]) -> str:
    status = user.get("approval_status")
    if status in {"pending", "approved", "rejected"}:
        return status
    return "approved" if user.get("active", True) else "pending"


def validate_user_profile_access(user: dict[str, Any], profile: str) -> None:
    normalized_profile = normalize_profile(profile)
    if not normalized_profile:
        raise AuthError("Perfil e obrigatorio.", 400)
    if normalized_profile not in normalize_profiles(user.get("profiles")):
        raise AuthError("Perfil nao permitido para este usuario.", 403)

    if normalized_profile == "medico":
        approval_status = get_doctor_approval_status(user)
        if approval_status == "pending":
            raise AuthError("Cadastro aguardando aprovação do administrador.", 403)
        if approval_status == "rejected":
            raise AuthError("Cadastro rejeitado. Entre em contato com a administração.", 403)
        if approval_status != "approved" or not user.get("active", True):
            raise AuthError("Cadastro aguardando aprovação do administrador.", 403)
        return

    if not user.get("active", True):
        raise AuthError("Conta inativa.", 403)


def list_doctor_requests(status: str = "pending") -> list[dict[str, Any]]:
    normalized_status = status if status in {"pending", "approved", "rejected", "all"} else "pending"
    doctors = []
    for user in load_users_database().get("users", []):
        if "medico" not in normalize_profiles(user.get("profiles")):
            continue
        approval_status = get_doctor_approval_status(user)
        if normalized_status != "all" and approval_status != normalized_status:
            continue
        doctors.append(sanitize_doctor_request(user))

    status_order = {"pending": 0, "approved": 1, "rejected": 2}
    return sorted(
        doctors,
        key=lambda item: (
            status_order.get(item.get("approval_status"), 9),
            item.get("created_at") or "",
        ),
        reverse=False,
    )


def _update_doctor_request(user_id: str, updater) -> dict[str, Any]:
    data = load_users_database()
    for user in data.get("users", []):
        if user.get("id") == user_id:
            if "medico" not in normalize_profiles(user.get("profiles")):
                raise AuthError("Usuario nao e medico.", 400)
            updater(user)
            save_users_database(data)
            return sanitize_doctor_request(user)
    raise AuthError("Solicitacao de medico nao encontrada.", 404)


def approve_doctor_request(user_id: str, admin_id: str) -> dict[str, Any]:
    now = _utcnow().isoformat()

    def updater(user: dict[str, Any]) -> None:
        user["active"] = True
        user["approval_status"] = "approved"
        user["approved_at"] = now
        user["approved_by"] = admin_id
        user["rejected_at"] = None
        user["rejected_by"] = None
        user["rejection_reason"] = None

    return _update_doctor_request(user_id, updater)


def reject_doctor_request(user_id: str, admin_id: str, reason: Any = None) -> dict[str, Any]:
    now = _utcnow().isoformat()
    rejection_reason = reason.strip() if isinstance(reason, str) and reason.strip() else None

    def updater(user: dict[str, Any]) -> None:
        user["active"] = False
        user["approval_status"] = "rejected"
        user["rejected_at"] = now
        user["rejected_by"] = admin_id
        user["rejection_reason"] = rejection_reason
        user["approved_at"] = None
        user["approved_by"] = None

    return _update_doctor_request(user_id, updater)


def create_access_token(user: dict[str, Any], profile: str) -> tuple[str, int]:
    normalized_profile = normalize_profile(profile)
    validate_user_profile_access(user, normalized_profile)

    expires_in = int(settings.auth_token_expiration_minutes) * 60
    now = _utcnow()
    payload = {
        "sub": user.get("id"),
        "email": user.get("email"),
        "profile": normalized_profile,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
    }

    secret = get_auth_secret()
    if pyjwt:
        token = pyjwt.encode(payload, secret, algorithm="HS256")
    else:
        token = _fallback_jwt_encode(payload, secret)
    return token, expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    if not token:
        raise AuthError("Token obrigatorio", 401)

    secret = get_auth_secret()
    try:
        if pyjwt:
            return pyjwt.decode(token, secret, algorithms=["HS256"])
        return _fallback_jwt_decode(token, secret)
    except AuthError:
        raise
    except Exception as exc:
        raise AuthError("Token invalido", 401) from exc


def get_user_from_token(token: str) -> tuple[dict[str, Any], dict[str, Any]]:
    payload = decode_access_token(token)
    user = find_user_by_id(payload.get("sub"))
    profile = normalize_profile(payload.get("profile"))

    if not user or not user.get("active", True):
        raise AuthError("Token invalido", 401)
    if profile not in normalize_profiles(user.get("profiles")):
        raise AuthError("Perfil nao permitido para este usuario", 403)

    return user, payload


def user_has_profile(user: dict[str, Any], profile: str) -> bool:
    return normalize_profile(profile) in normalize_profiles(user.get("profiles"))


def profile_has_permission(profile: str, permission: str) -> bool:
    return permission in PROFILE_PERMISSIONS.get(normalize_profile(profile), set())
