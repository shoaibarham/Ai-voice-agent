import os
import httpx
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

class RetellService:
    def __init__(self):
        self.api_key = os.getenv("RETELL_API_KEY")
        self.base_url = "https://api.retellai.com/v2"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def create_phone_call(self, phone_number: str, agent_config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a phone call using Retell AI"""
        
        # Build the agent configuration for this specific call
        agent_prompt = self._build_dynamic_prompt(agent_config, context)
        
        call_payload = {
            "from_number": "+1234567890",  # Your Retell phone number
            "to_number": phone_number,
            "override_agent_id": os.getenv("RETELL_AGENT_ID"),
            "agent_settings": {
                "llm_websocket_url": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/api/llm-websocket",
                "begin_message": f"Hi {context['driver_name']}, this is Dispatch with a check call on load {context['load_number']}. Can you give me an update on your status?",
                "general_prompt": agent_prompt,
                "general_tools": [],
                "interruption_sensitivity": agent_config.get("interruption_sensitivity", 0.5),
                "enable_backchannel": agent_config.get("backchannel_enabled", True),
                "backchannel_frequency": 0.8,
                "backchannel_words": ["uh-huh", "mm-hmm", "I see", "okay"],
                "reminder_trigger_ms": 10000,
                "reminder_max_count": 2,
                "ambient_sound": "office"
            },
            "metadata": {
                "driver_name": context["driver_name"],
                "load_number": context["load_number"],
                "scenario_type": agent_config["scenario_type"],
                "config_id": agent_config["id"]
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/create-phone-call",
                    headers=self.headers,
                    json=call_payload,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Retell API error: {e}")
                raise Exception(f"Failed to create call: {str(e)}")

    def _build_dynamic_prompt(self, agent_config: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Build a dynamic prompt based on agent configuration and call context"""
        
        base_prompt = agent_config["system_prompt"]
        
        # Add context-specific information
        context_prompt = f"""
        
        CALL CONTEXT:
        - Driver Name: {context["driver_name"]}
        - Load Number: {context["load_number"]}
        - Call Purpose: Status update and check-in
        
        CONVERSATION FLOW:
        {agent_config["conversation_flow"]}
        
        EMERGENCY DETECTION:
        If you hear any of these words or phrases, immediately switch to emergency protocol: {', '.join(agent_config.get("emergency_triggers", []))}
        
        When an emergency is detected:
        1. Acknowledge the emergency immediately
        2. Ask for their exact location with mile markers if possible
        3. Determine the type of emergency (accident, breakdown, medical, other)
        4. Gather any additional safety information
        5. Assure them that a human dispatcher will call them back immediately
        6. End the call quickly
        
        RESPONSE GUIDELINES:
        - Keep responses concise and professional
        - Ask one question at a time
        - If you get unclear responses, ask for clarification up to 2 times
        - If the driver is uncooperative or unresponsive, politely end the call
        - Always maintain a helpful and professional tone
        """
        
        return base_prompt + context_prompt

    async def get_call_details(self, call_id: str) -> Optional[Dict[str, Any]]:
        """Get call details from Retell AI"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/get-call/{call_id}",
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Error fetching call details: {e}")
                return None

    async def list_agents(self) -> List[Dict[str, Any]]:
        """List all agents"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/list-agents",
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError:
                return []