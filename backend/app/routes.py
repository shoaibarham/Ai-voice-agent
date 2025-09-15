from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
import uuid
from datetime import datetime

from .database import get_db
from .models import AgentConfigCreate, AgentConfigUpdate, CallCreate, RetellWebhook
from .services.retell_service import RetellService
from .services.call_processor import CallProcessor

router = APIRouter()
retell_service = RetellService()
call_processor = CallProcessor()

# -----------------------
# Agent Config Endpoints
# -----------------------

@router.get("/agent-configs")
async def get_agent_configs():
    try:
        db = get_db()
        response = db.table("agent_configs").select("*").order("created_at", desc=True).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching agent configs: {e}")

@router.post("/agent-configs")
async def create_agent_config(config: AgentConfigCreate):
    try:
        db = get_db()
        # Only allow valid columns
        allowed_fields = [
            "name", "scenario_type", "system_prompt", "conversation_flow",
            "emergency_triggers", "max_retries", "interruption_sensitivity",
            "backchannel_enabled", "filler_words_enabled"
        ]
        config_data = {k: v for k, v in config.dict().items() if k in allowed_fields}
        response = db.table("agent_configs").insert(config_data).execute()
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating agent config: {e}")

@router.get("/agent-configs/{config_id}")
async def get_agent_config(config_id: str):
    try:
        db = get_db()
        response = db.table("agent_configs").select("*").eq("id", config_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Agent config not found")
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching agent config: {e}")

@router.put("/agent-configs/{config_id}")
async def update_agent_config(config_id: str, config: AgentConfigUpdate):
    try:
        db = get_db()
        allowed_fields = [
            "name", "scenario_type", "system_prompt", "conversation_flow",
            "emergency_triggers", "max_retries", "interruption_sensitivity",
            "backchannel_enabled", "filler_words_enabled"
        ]
        update_data = {k: v for k, v in config.dict().items() if v is not None and k in allowed_fields}
        update_data["updated_at"] = datetime.now().isoformat()
        response = db.table("agent_configs").update(update_data).eq("id", config_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Agent config not found")
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating agent config: {e}")

@router.delete("/agent-configs/{config_id}")
async def delete_agent_config(config_id: str):
    try:
        db = get_db()
        db.table("agent_configs").delete().eq("id", config_id).execute()
        return {"success": True, "message": "Agent config deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting agent config: {e}")


# -----------------------
# Calls Endpoints
# -----------------------

@router.post("/calls/start")
async def start_call(call_data: CallCreate):
    try:
        db = get_db()

        # 1️⃣ Fetch the agent config
        config_response = db.table("agent_configs").eq("id", call_data.agent_config_id).execute()
        if not config_response.data:
            raise HTTPException(status_code=404, detail="Agent config not found")
        agent_config = config_response.data[0]

        # 2️⃣ Prepare Retell agent payload
        agent_config_payload = {
            "name": agent_config["name"],
            "scenario_type": agent_config["scenario_type"],
            "system_prompt": agent_config["system_prompt"],
            "conversation_flow": agent_config["conversation_flow"],
            "emergency_triggers": agent_config.get("emergency_triggers", [])
        }

        # 3️⃣ Define context for WebRTC call
        context = {
            "driver_name": call_data.driver_name,
            "load_number": call_data.load_number
        }

        # 4️⃣ Insert initial call record in DB
        call_record = {
            "call_id": str(uuid.uuid4()),
            "agent_config_id": call_data.agent_config_id,
            "driver_name": call_data.driver_name,
            "driver_phone": None,  # Not needed for WebRTC
            "load_number": call_data.load_number,
            "call_status": "initiated",
            "transcript": "",
            "duration": 0
        }
        call_response = db.table("calls").insert(call_record, returning="representation").execute()
        if not call_response.data:
            raise HTTPException(status_code=500, detail="Failed to create call record")
        created_call = call_response.data[0]

        # 5️⃣ Start WebRTC session
        retell_response = await retell_service.create_webrtc_session(
            agent_config=agent_config_payload,
            context=context
        )

        # 6️⃣ Update DB status
        db.table("calls").update({
            "call_status": "in_progress"
        }).eq("call_id", created_call["call_id"]).execute()

        return {
            "success": True,
            "call_id": created_call["call_id"],
            "token": retell_response["token"],
            "agent_id": retell_response["agent_id"],
            "message": "WebRTC call ready"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting call: {e}")



@router.get("/calls")
async def get_calls():
    try:
        db = get_db()
        response = db.table("calls").select("*").order("started_at", desc=True).execute()
        calls_data = response.data or []

        # Map agent names manually
        for call in calls_data:
            agent_response = db.table("agent_configs").select("name").eq("id", call["agent_config_id"]).execute()
            call["agent_name"] = agent_response.data[0]["name"] if agent_response.data else None

        return {"success": True, "data": calls_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching calls: {e}")


@router.get("/calls/{call_id}")
async def get_call_details(call_id: str):
    try:
        result = await call_processor.get_call_summary(call_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching call details: {e}")


@router.get("/calls/{call_id}/results")
async def get_call_results(call_id: str):
    try:
        db = get_db()
        response = db.table("call_results").select("*").eq("call_id", call_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Call results not found")
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching call results: {e}")


# -----------------------
# Retell Webhook
# -----------------------

@router.post("/retell-webhook")
async def retell_webhook(webhook_data: RetellWebhook, background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(call_processor.handle_retell_webhook, webhook_data.dict())
        return {"success": True, "message": "Webhook received"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# -----------------------
# Dashboard Stats
# -----------------------

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    try:
        db = get_db()
        # Fetch call status stats
        try:
            calls_response = db.table("calls").select("*").execute()
            calls_data = calls_response.data or []
        except:
            calls_data = []

        stats = {
            "total_calls": len(calls_data),
            "completed_calls": len([c for c in calls_data if c.get("call_status") == "completed"]),
            "in_progress_calls": len([c for c in calls_data if c.get("call_status") == "in_progress"]),
            "failed_calls": len([c for c in calls_data if c.get("call_status") == "failed"])
        }

        # Recent 5 calls
        try:
            recent_calls_resp = db.table("calls").select("*").order("started_at", desc=True).limit(5).execute()
            recent_calls = recent_calls_resp.data or []
            for call in recent_calls:
                agent_resp = db.table("agent_configs").select("name").eq("id", call["agent_config_id"]).execute()
                call["agent_name"] = agent_resp.data[0]["name"] if agent_resp.data else None
        except:
            recent_calls = []

        return {"success": True, "data": {"stats": stats, "recent_calls": recent_calls}}

    except Exception as e:
        return {
            "success": True,
            "data": {
                "stats": {"total_calls": 0, "completed_calls": 0, "in_progress_calls": 0, "failed_calls": 0},
                "recent_calls": []
            }
        }

