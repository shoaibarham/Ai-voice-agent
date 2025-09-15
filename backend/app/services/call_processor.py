import json
import asyncio
from typing import Dict, Any, Optional
from ..database import get_db
from .openai_service import OpenAIService
from .retell_service import RetellService

class CallProcessor:
    def __init__(self):
        self.openai_service = OpenAIService()
        self.retell_service = RetellService()

    async def process_completed_call(self, call_id: str, retell_call_id: str) -> Dict[str, Any]:
        """Process a completed call and extract structured data"""
        
        try:
            # Get call details from database
            db = get_db()
            call_response = db.table("calls").select("*").eq("call_id", retell_call_id).execute()
            
            if not call_response.data:
                raise Exception(f"Call not found: {retell_call_id}")
            
            call_data = call_response.data[0]
            
            # Get agent configuration
            config_response = db.table("agent_configs").select("*").eq("id", call_data["agent_config_id"]).execute()
            
            if not config_response.data:
                raise Exception(f"Agent config not found: {call_data['agent_config_id']}")
            
            agent_config = config_response.data[0]
            
            # Get call details from Retell AI
            retell_call_details = await self.retell_service.get_call_details(retell_call_id)
            
            if not retell_call_details:
                raise Exception(f"Could not fetch call details from Retell: {retell_call_id}")
            
            # Extract transcript
            transcript = retell_call_details.get("transcript", "")
            
            if not transcript:
                # Return basic structure if no transcript
                structured_data = {
                    "call_outcome": "No Transcript Available",
                    "processing_error": "Transcript not available from Retell AI"
                }
            else:
                # Process transcript with OpenAI
                structured_data = await self.openai_service.process_transcript(
                    transcript, 
                    agent_config["scenario_type"]
                )
            
            # Save call results to database
            call_result_data = {
                "call_id": call_data["id"],
                "call_outcome": structured_data.get("call_outcome"),
                "driver_status": structured_data.get("driver_status"),
                "current_location": structured_data.get("current_location"),
                "eta": structured_data.get("eta"),
                "emergency_type": structured_data.get("emergency_type"),
                "emergency_location": structured_data.get("emergency_location"),
                "escalation_status": structured_data.get("escalation_status"),
                "raw_transcript": transcript,
                "structured_data": structured_data,
                "processing_status": "processed"
            }
            
            result_response = db.table("call_results").insert(call_result_data).execute()
            
            # Update call status
            db.table("calls").update({
                "call_status": "completed",
                "ended_at": retell_call_details.get("end_timestamp"),
                "duration": self._calculate_duration(
                    retell_call_details.get("start_timestamp"),
                    retell_call_details.get("end_timestamp")
                )
            }).eq("id", call_data["id"]).execute()
            
            return {
                "success": True,
                "call_result_id": result_response.data[0]["id"],
                "structured_data": structured_data,
                "transcript": transcript
            }
            
        except Exception as e:
            print(f"Error processing call {call_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def handle_retell_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming Retell AI webhook"""
        
        event_type = webhook_data.get("event")
        call_data = webhook_data.get("data", {})
        call_id = call_data.get("call_id")
        
        if not call_id:
            return {"success": False, "error": "No call_id in webhook data"}
        
        db = get_db()
        
        try:
            if event_type == "call_started":
                # Update call status to in_progress
                db.table("calls").update({
                    "call_status": "in_progress"
                }).eq("call_id", call_id).execute()
                
                return {"success": True, "message": "Call started"}
            
            elif event_type == "call_ended":
                # Process the completed call
                result = await self.process_completed_call(call_id, call_id)
                return result
            
            elif event_type == "call_analyzed":
                # Handle call analysis completion
                transcript = call_data.get("transcript", "")
                if transcript:
                    # Update existing call result with new transcript
                    call_response = db.table("calls").select("id").eq("call_id", call_id).execute()
                    if call_response.data:
                        db.table("call_results").update({
                            "raw_transcript": transcript
                        }).eq("call_id", call_response.data[0]["id"]).execute()
                
                return {"success": True, "message": "Call analyzed"}
            
            else:
                return {"success": True, "message": f"Unhandled event type: {event_type}"}
                
        except Exception as e:
            print(f"Error handling webhook: {e}")
            return {"success": False, "error": str(e)}

    def _calculate_duration(self, start_time: str, end_time: str) -> Optional[int]:
        """Calculate call duration in seconds"""
        try:
            if not start_time or not end_time:
                return None
            
            from datetime import datetime
            start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            
            duration = (end - start).total_seconds()
            return int(duration)
        except:
            return None

    async def get_call_summary(self, call_id: str) -> Dict[str, Any]:
        """Get comprehensive call summary"""
        
        db = get_db()
        
        # Get call and result data with joins
        query = """
        SELECT 
            c.*,
            cr.*,
            ac.name as agent_name,
            ac.scenario_type
        FROM calls c
        LEFT JOIN call_results cr ON c.id = cr.call_id
        LEFT JOIN agent_configs ac ON c.agent_config_id = ac.id
        WHERE c.id = %s
        """
        
        try:
            result = db.rpc('execute_sql', {'sql': query, 'params': [call_id]}).execute()
            
            if not result.data:
                return {"error": "Call not found"}
            
            call_data = result.data[0]
            
            return {
                "call_info": {
                    "id": call_data["id"],
                    "driver_name": call_data["driver_name"],
                    "driver_phone": call_data["driver_phone"],
                    "load_number": call_data["load_number"],
                    "agent_name": call_data["agent_name"],
                    "scenario_type": call_data["scenario_type"],
                    "call_status": call_data["call_status"],
                    "started_at": call_data["started_at"],
                    "ended_at": call_data["ended_at"],
                    "duration": call_data["duration"]
                },
                "results": {
                    "call_outcome": call_data.get("call_outcome"),
                    "driver_status": call_data.get("driver_status"),
                    "current_location": call_data.get("current_location"),
                    "eta": call_data.get("eta"),
                    "emergency_type": call_data.get("emergency_type"),
                    "emergency_location": call_data.get("emergency_location"),
                    "escalation_status": call_data.get("escalation_status")
                },
                "transcript": call_data.get("raw_transcript"),
                "structured_data": call_data.get("structured_data")
            }
            
        except Exception as e:
            return {"error": str(e)}