from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv



load_dotenv()

from .routes import router
from .database import init_db



app = FastAPI(
    title="AI Voice Agent Tool",
    description="Backend API for AI Voice Agent Management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database connection
@app.on_event("startup")
async def startup():
    await init_db()

# Include routes
app.include_router(router, prefix="/api")

# Health check
@app.get("/")
async def root():
    return {"message": "AI Voice Agent Tool API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
