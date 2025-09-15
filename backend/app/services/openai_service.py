import os
import openai
import json
from typing import Dict, Any, Optional

class OpenAIService:
    def __init__(self):
        openai.api_key = os.getenv("OPENAI_API_KEY")
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    async def process_transcript(self, transcript: str, scenario_type: str) -> Dict[str, Any]:
        """Process raw transcript and extract structured data"""
        
        if scenario_type == "check_in":
            return await self._process_checkin_transcript(transcript)
        elif scenario_type == "emergency":
            return await self._process_emergency_transcript(transcript)
        else:
            return await self._process_generic_transcript(transcript)

    async def _process_checkin_transcript(self, transcript: str) -> Dict[str, Any]:
        """Process check-in call transcript"""
        
        prompt = f"""
        Analyze this truck driver check-in call transcript and extract the following information in JSON format:

        Required fields:
        - call_outcome: "In-Transit Update" OR "Arrival Confirmation" OR "Emergency Detected" OR "Uncooperative Driver" OR "Call Failed"
        - driver_status: "Driving" OR "Delayed" OR "Arrived" OR "Unknown"
        - current_location: Extract the current location mentioned by the driver (or null if not provided)
        - eta: Extract the estimated time of arrival (or null if not provided)
        - emergency_type: Only if emergency detected - "Accident" OR "Breakdown" OR "Medical" OR "Other" OR null
        - emergency_location: Only if emergency - location of emergency OR null
        - escalation_status: "Escalation Flagged" if emergency detected, otherwise null
        - additional_notes: Any other relevant information from the call

        Transcript:
        {transcript}

        Return only valid JSON:
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing logistics call transcripts. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            print(f"Error processing transcript with OpenAI: {e}")
            return self._get_default_structure(transcript)

    async def _process_emergency_transcript(self, transcript: str) -> Dict[str, Any]:
        """Process emergency call transcript"""
        
        prompt = f"""
        Analyze this emergency logistics call transcript and extract the following information in JSON format:

        Required fields:
        - call_outcome: "Emergency Detected"
        - emergency_type: "Accident" OR "Breakdown" OR "Medical" OR "Other"
        - emergency_location: The specific location of the emergency including mile markers if mentioned
        - driver_status: "In Emergency" OR "Safe" OR "Injured" OR "Unknown"
        - escalation_status: "Escalation Flagged"
        - urgency_level: "High" OR "Medium" OR "Low"
        - additional_details: Any other critical emergency information

        Transcript:
        {transcript}

        Return only valid JSON:
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing emergency logistics calls. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            print(f"Error processing emergency transcript: {e}")
            return self._get_emergency_default_structure(transcript)

    async def _process_generic_transcript(self, transcript: str) -> Dict[str, Any]:
        """Process generic call transcript"""
        
        prompt = f"""
        Analyze this call transcript and extract key information in JSON format:

        Fields to extract:
        - call_outcome: Brief description of what happened in the call
        - key_information: List of important points discussed
        - sentiment: "Positive" OR "Negative" OR "Neutral"
        - call_success: true OR false

        Transcript:
        {transcript}

        Return only valid JSON:
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing call transcripts. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=300
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            print(f"Error processing generic transcript: {e}")
            return {"call_outcome": "Processing Failed", "error": str(e)}

    def _get_default_structure(self, transcript: str) -> Dict[str, Any]:
        """Return default structure when AI processing fails"""
        return {
            "call_outcome": "Processing Failed",
            "driver_status": "Unknown",
            "current_location": None,
            "eta": None,
            "emergency_type": None,
            "emergency_location": None,
            "escalation_status": None,
            "additional_notes": "Failed to process transcript automatically"
        }

    def _get_emergency_default_structure(self, transcript: str) -> Dict[str, Any]:
        """Return default emergency structure when AI processing fails"""
        return {
            "call_outcome": "Emergency Detected",
            "emergency_type": "Other",
            "emergency_location": "Unknown",
            "driver_status": "Unknown",
            "escalation_status": "Escalation Flagged",
            "urgency_level": "High",
            "additional_details": "Failed to process emergency transcript automatically"
        }