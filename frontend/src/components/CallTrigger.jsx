import React, { useState, useEffect } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { callsApi, agentConfigApi } from '../services/api';



// IMPORTANT: Ensure you have initialized the Retell SDK in App.jsx or main.jsx
// import { Retell } from '@retell/sdk';
// Retell.initialize({});

const CallTrigger = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    agent_config_id: '',
    driver_name: '',
    load_number: ''
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await agentConfigApi.getAll();
      if (response.data.success) {
        setConfigs(response.data.data);
        if (response.data.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            agent_config_id: response.data.data[0].id
          }));
        }
      }
    } catch (error) {
      toast.error('Failed to fetch agent configurations');
      console.error(error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agent_config_id) {
      toast.error('Please select an agent configuration');
      return;
    }

    setLoading(true);

    try {
      // Start WebRTC call instead of phone
      const response = await callsApi.startWebRTC(formData);



      if (response.data.success) {
        toast.success('Call started successfully!');
        
        // Connect using Retell WebRTC SDK
        window.Retell.connect(response.data.token, response.data.agent_id);

        // Reset form
        setFormData({
          agent_config_id: configs[0]?.id || '',
          driver_name: '',
          load_number: ''
        });
      } else {
        toast.error('Failed to start call');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start call');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectedConfig = configs.find(c => c.id === formData.agent_config_id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Start Test Call</h2>
        <p className="mt-1 text-sm text-gray-600">
          Trigger an in-app call using your configured AI voice agent
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Call Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Call Details</h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="agent_config_id" className="block text-sm font-medium text-gray-700">
                Agent Configuration
              </label>
              <select
                id="agent_config_id"
                name="agent_config_id"
                required
                value={formData.agent_config_id}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an agent configuration</option>
                {configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} ({config.scenario_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="driver_name" className="block text-sm font-medium text-gray-700">
                Driver Name
              </label>
              <input
                type="text"
                id="driver_name"
                name="driver_name"
                required
                value={formData.driver_name}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mike Johnson"
              />
            </div>

            <div>
              <label htmlFor="load_number" className="block text-sm font-medium text-gray-700">
                Load Number
              </label>
              <input
                type="text"
                id="load_number"
                name="load_number"
                required
                value={formData.load_number}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="7891-B"
              />
            </div>

            <button
              type="submit"
              disabled={loading || configs.length === 0}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Start In-App Call
                </>
              )}
            </button>
          </form>

          {configs.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                No agent configurations available. Please create an agent configuration first.
              </p>
            </div>
          )}
        </div>

        {/* Configuration Preview */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Selected Configuration</h3>
          {selectedConfig ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Configuration Name</h4>
                <p className="mt-1 text-sm text-gray-900">{selectedConfig.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Scenario Type</h4>
                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedConfig.scenario_type === 'check_in' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedConfig.scenario_type === 'check_in' ? 'Check-in' : 'Emergency'}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">System Prompt</h4>
                <p className="mt-1 text-sm text-gray-600 max-h-32 overflow-y-auto">
                  {selectedConfig.system_prompt}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Conversation Flow</h4>
                <p className="mt-1 text-sm text-gray-600 max-h-24 overflow-y-auto">
                  {selectedConfig.conversation_flow}
                </p>
              </div>
              {selectedConfig.emergency_triggers?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Emergency Triggers</h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedConfig.emergency_triggers.map((trigger, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700"
                      >
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Select an agent configuration to see details
            </div>
          )}
        </div>
      </div>

      {/* Call Preview */}
      {formData.driver_name && formData.load_number && selectedConfig && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">Call Preview</h3>
          <div className="bg-white rounded-md p-4">
            <p className="text-sm text-gray-600 mb-2">The agent will say:</p>
            <p className="text-sm text-gray-900 italic">
              "Hi {formData.driver_name}, this is Dispatch with a check call on load {formData.load_number}. 
              Can you give me an update on your status?"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallTrigger;
