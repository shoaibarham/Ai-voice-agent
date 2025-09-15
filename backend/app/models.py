from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ScenarioType(str, Enum):
    CHECK_IN = "check_in"
    EMERGENCY = "emergency"

class CallStatus(str, Enum):
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class AgentConfigCreate(BaseModel):
    name: str
    scenario_type: ScenarioType
    system_prompt: str
    conversation_flow: str
    emergency_triggers: List[str] = []
    max_retries: int = 3
    interruption_sensitivity: float = 0.5
    backchannel_enabled: bool = True
    filler_words_enabled: bool = True

class AgentConfigUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    conversation_flow: Optional[str] = None
    emergency_triggers: Optional[List[str]] = None
    max_retries: Optional[int] = None
    interruption_sensitivity: Optional[float] = None
    backchannel_enabled: Optional[bool] = None
    filler_words_enabled: Optional[bool] = None

class CallCreate(BaseModel):
    agent_config_id: str
    driver_name: str
    driver_phone: str
    load_number: str

class CallUpdate(BaseModel):
    call_status: Optional[CallStatus] = None
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None

class CallResultCreate(BaseModel):
    call_id: str
    call_outcome: Optional[str] = None
    driver_status: Optional[str] = None
    current_location: Optional[str] = None
    eta: Optional[str] = None
    emergency_type: Optional[str] = None
    emergency_location: Optional[str] = None
    escalation_status: Optional[str] = None
    raw_transcript: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None

class RetellWebhook(BaseModel):
    event: str
    data: Dict[str, Any]

class RetellCallData(BaseModel):
    call_id: str
    agent_id: str
    call_status: str
    from_number: Optional[str] = None
    to_number: Optional[str] = None
    transcript: Optional[str] = None
    recording_url: Optional[str] = None
    start_timestamp: Optional[datetime] = None
    end_timestamp: Optional[datetime] = None