from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=False,  # aiomysql ping() has incompatible signature — keep disabled
    pool_recycle=3600,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """
    Yield a session and guarantee clean teardown.

    Using explicit try/finally instead of `async with` so that:
    - A failed rollback in the exception path never suppresses the original error.
    - A failed close never raises into uvicorn's ASGI scope (which would close
      the transport before the HTTP response is sent → browser sees "Failed to fetch").
    """
    session = AsyncSessionLocal()
    try:
        yield session
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass          # connection may already be broken — ignore
        raise             # re-raise original so FastAPI exception handlers fire
    finally:
        try:
            await session.close()
        except Exception:
            pass          # never let close() bubble up through ASGI
