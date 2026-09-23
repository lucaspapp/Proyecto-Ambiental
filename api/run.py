import os
from pathlib import Path

import uvicorn
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parent / ".env")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8003")),
        reload=os.getenv("API_RELOAD", "false").lower() == "true",
    )
