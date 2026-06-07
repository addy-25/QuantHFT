import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User

router = APIRouter()


# ── request/response schemas ──────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str

    class Config:
        # basic password length validation
        @staticmethod
        def validate_password(v):
            if len(v) < 8:
                raise ValueError("password must be at least 8 characters")
            return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str


class UserResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    is_admin: bool

    model_config = {"from_attributes": True}


# ── routes ────────────────────────────────────────────────

@router.post("/auth/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    creates a new user account
    returns a JWT token immediately so the user is logged in
    """
    # check if email already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email already registered"
        )

    if len(request.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="password must be at least 8 characters"
        )

    # create the user with a hashed password
    user = User(
        id              = str(uuid.uuid4()),
        email           = request.email,
        hashed_password = hash_password(request.password),
        is_active       = True,
        is_admin        = False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # create and return a token so they're immediately logged in
    token = create_access_token(user.id)

    return TokenResponse(
        access_token = token,
        user_id      = user.id,
        email        = user.email,
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    logs in with email and password
    returns a JWT token

    uses OAuth2PasswordRequestForm which expects:
    - username (we use email here)
    - password
    sent as form data, not JSON
    """
    # find user by email
    # OAuth2PasswordRequestForm uses 'username' field
    # we're using email as the username
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="account is deactivated"
        )

    token = create_access_token(user.id)

    return TokenResponse(
        access_token = token,
        user_id      = user.id,
        email        = user.email,
    )


@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    returns the currently logged in user's info
    this route is protected — requires a valid JWT token
    """
    return current_user