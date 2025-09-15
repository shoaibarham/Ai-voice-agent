-- Supabase Database Schema

-- Agent configurations table
CREATE TABLE agent_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    scenario_type VARCHAR(50) NOT NULL, -- 'check_in' or 'emergency'
    system_prompt TEXT NOT NULL,
    conversation_flow TEXT NOT NULL,
    emergency_triggers TEXT[], -- Array of emergency trigger phrases
    max_retries INTEGER DEFAULT 3,
    interruption_sensitivity DECIMAL(3,2) DEFAULT 0.5,
    backchannel_enabled BOOLEAN DEFAULT true,
    filler_words_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table
CREATE TABLE calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL, -- Retell call ID
    agent_config_id UUID REFERENCES agent_configs(id),
    driver_name VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    load_number VARCHAR(50) NOT NULL,
    call_status VARCHAR(20) DEFAULT 'initiated', -- 'initiated', 'in_progress', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call results table
CREATE TABLE call_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID REFERENCES calls(id),
    call_outcome VARCHAR(50), -- 'In-Transit Update', 'Arrival Confirmation', 'Emergency Detected'
    driver_status VARCHAR(20), -- 'Driving', 'Delayed', 'Arrived'
    current_location TEXT,
    eta VARCHAR(100),
    emergency_type VARCHAR(20), -- 'Accident', 'Breakdown', 'Medical', 'Other'
    emergency_location TEXT,
    escalation_status VARCHAR(20), -- 'Escalation Flagged'
    raw_transcript TEXT,
    structured_data JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);





-- Insert default agent configurations
INSERT INTO agent_configs (name, scenario_type, system_prompt, conversation_flow, emergency_triggers) VALUES 
(
    'Driver Check-in Agent',
    'check_in',
    'You are a professional dispatch agent calling truck drivers for status updates. You are friendly, efficient, and focused on getting accurate information about their current status and location. Always maintain a professional tone while being conversational.',
    'Start with greeting and stating purpose -> Ask for status update -> Based on response, ask for location details -> If driving, ask for ETA -> If arrived, confirm arrival details -> Thank and end call',
    ARRAY['emergency', 'accident', 'breakdown', 'blowout', 'medical', 'help', 'crash', 'stuck']
),
(
    'Emergency Response Agent',
    'emergency',
    'You are an emergency-trained dispatch agent. When an emergency is detected, immediately shift focus to gathering critical safety information. Stay calm, ask clear questions, and assure the driver that help is coming.',
    'Detect emergency trigger -> Acknowledge emergency -> Ask for specific location with mile markers -> Determine emergency type -> Gather additional safety details -> Assure help is coming -> End call to dispatch human agent',
    ARRAY['emergency', 'accident', 'breakdown', 'blowout', 'medical', 'help', 'crash', 'stuck', 'fire', 'injured']
);

-- Create indexes for better performance
CREATE INDEX idx_calls_status ON calls(call_status);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_call_results_call_id ON call_results(call_id);
CREATE INDEX idx_agent_configs_scenario ON agent_configs(scenario_type);