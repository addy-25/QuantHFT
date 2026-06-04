from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# create_engine sets up the connection pool to PostgreSQL
# pool_pre_ping=True means SQLAlchemy tests the connection
# before using it — handles dropped connections gracefully
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True
)

# SessionLocal is a factory — every time you call SessionLocal()
# you get a new database session (like a transaction)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base is the parent class for all your SQLAlchemy models
# Any class that inherits from Base becomes a database table
class Base(DeclarativeBase):
    pass

# get_db is a FastAPI dependency
# it creates a session, gives it to the route, then closes it
# the try/finally guarantees the session always closes
# even if an exception occurs mid-request
def get_db():
    db = SessionLocal()
    try:
        yield db        # give the session to the route
    finally:
        db.close()      # always close after the request finishes