from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import uuid
from datetime import datetime

from .database import get_db
from .models import (
    AgentConfigCreate, AgentConfigUpdate, CallCreate, 
    RetellWebhook, CallStatus
)
from .services.retell_service import RetellService
from .services.call_processor import CallProcessor

router = APIRouter()
retell_service = RetellService()
call_processor = CallProcessor()

# Agent Configuration Routes
@router.get("/agent-configs")
async def get_agent_configs():
    """Get all agent configurations"""
    try:
        db = get_db()
        response = db.table("agent_configs").select("*").order("created_at", desc=True).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agent-configs")
async def create_agent_config(config: AgentConfigCreate):
    """Create new agent configuration"""
    try:
        db = get_db()
        config_data = config.dict()
        response = db.table("agent_configs").insert(config_data).execute()
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agent-configs/{config_id}")
async def get_agent_config(config_id: str):
    """Get specific agent configuration"""
    try:
        db = get_db()
        response = db.table("agent_configs").select("*").eq("id", config_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Agent config not found")
        return {"success": True, "data": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/agent-configs/{config_id}")
async def update_agent_config(config_id: str, config: AgentConfigUpdate):
    """Update agent configuration"""
    try:
        db = get_db()
        update_data = {k: v for k, v in config.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = db.table("agent_configs").update(update_data).eq("id", config_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Agent config not found")
        return {"success": True, "data": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/agent-configs/{config_id}")
async def delete_agent_config(config_id: str):
    """Delete agent configuration"""
    try:
        db = get_db()
        response = db.table("agent_configs").delete().eq("id", config_id).execute()
        return {"success": True, "message": "Agent config deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Call Management Routes
@router.post("/calls/start")
async def start_call(call_data: CallCreate):
    """Start a new call"""
    try:
        db = get_db()
        
        # Get agent configuration
        config_response = db.table("agent_configs").select("*").eq("id", call_data.agent_config_id).execute()
        if not config_response.data:
            raise HTTPException(status_code=404, detail="Agent config not found")
        
        agent_config = config_response.data[0]
        
        # Create call record
        call_record = {
            "call_id": str(uuid.uuid4()),
            "agent_config_id": call_data.agent_config_id,
            "driver_name": call_data.driver_name,
            "driver_phone": call_data.driver_phone,
            "load_number": call_data.load_number,
            "call_status": "initiated"
        }
        
        call_response = db.table("calls").insert(call_record).execute()
        created_call = call_response.data[0]
        
        # Start Retell AI call
        context = {
            "driver_name": call_data.driver_name,
            "load_number": call_data.load_number
        }
        
        retell_response = await retell_service.create_phone_call(
            call_data.driver_phone,
            agent_config,
            context
        )
        
        # Update call record with Retell call ID
        db.table("calls").update({
            "call_id": retell_response.get("call_id", call_record["call_id"])
        }).eq("id", created_call["id"]).execute()
        
        return {
            "success": True,
            "call_id": created_call["id"],
            "retell_call_id": retell_response.get("call_id"),
            "message": "Call started successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calls")
async def get_calls():
    """Get all calls with basic info"""
    try:
        db = get_db()
        response = db.table("calls").select("""
            id, call_id, driver_name, driver_phone, load_number,
            call_status, started_at, ended_at, duration,
            agent_configs!inner(name, scenario_type)
        """).order("started_at", desc=True).execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calls/{call_id}")
async def get_call_details(call_id: str):
    """Get detailed call information"""
    try:
        result = await call_processor.get_call_summary(call_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calls/{call_id}/results")
async def get_call_results(call_id: str):
    """Get call results and analysis"""
    try:
        db = get_db()
        response = db.table("call_results").select("*").eq("call_id", call_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Call results not found")
        return {"success": True, "data": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Retell AI Webhook
@router.post("/retell-webhook")
async def retell_webhook(webhook_data: RetellWebhook, background_tasks: BackgroundTasks):
    """Handle Retell AI webhooks"""
    try:
        # Process webhook in background to respond quickly
        background_tasks.add_task(
            call_processor.handle_retell_webhook,
            webhook_data.dict()
        )
        
        return {"success": True, "message": "Webhook received"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"success": False, "error": str(e)}

# LLM WebSocket endpoint for Retell AI
@router.websocket("/llm-websocket")
async def llm_websocket(websocket):
    """WebSocket endpoint for Retell AI LLM integration"""
    try:
        await websocket.accept()
        
        while True:
            # Receive message from Retell AI
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("interaction_type") == "response_required":
                # Generate response based on conversation context
                response = {
                    "response_id": data.get("response_id"),
                    "content": "I understand. Can you provide more details about your current location?",
                    "content_complete": True,
                    "end_call": False
                }
                
                # Check for emergency keywords in user message
                user_message = data.get("transcript", [])
                if user_message and any(keyword in str(user_message).lower() for keyword in 
                                      ["emergency", "accident", "breakdown", "help", "crash"]):
                    response["content"] = "I understand this is an emergency. Can you tell me your exact location with mile markers if possible?"
                    response["end_call"] = False
                
                await websocket.send_json(response)
            
            elif data.get("interaction_type") == "ping":
                # Respond to ping
                await websocket.send_json({"type": "pong"})
                
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

# Dashboard Analytics
@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        db = get_db()
        
        # Get call counts by status
        calls_response = db.table("calls").select("call_status").execute()
        calls_data = calls_response.data
        
        # Count by status
        stats = {
            "total_calls": len(calls_data),
            "completed_calls": len([c for c in calls_data if c["call_status"] == "completed"]),
            "in_progress_calls": len([c for c in calls_data if c["call_status"] == "in_progress"]),
            "failed_calls": len([c for c in calls_data if c["call_status"] == "failed"])
        }
        
        # Get recent calls
        recent_calls = db.table("calls").select("""
            id, driver_name, load_number, call_status, started_at,
            agent_configs!inner(name)
        """).order("started_at", desc=True).limit(5).execute()
        
        return {
            "success": True,
            "data": {
                "stats": stats,
                "recent_calls": recent_calls.data
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))