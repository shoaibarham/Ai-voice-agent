import os
from supabase import create_client, Client
from typing import Optional

# Supabase client
supabase: Optional[Client] = None

async def init_db():
    global supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
    
    supabase = create_client(url, key)
    print("Database initialized successfully")

def get_db():
    if supabase is None:
        raise RuntimeError("Database not initialized")
    return supabase