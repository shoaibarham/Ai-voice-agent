import React, { useState, useEffect } from 'react';
import { agentConfigApi } from '../services/api';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const AgentConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const defaultConfig = {
    name: '',
    scenario_type: 'check_in',
    system_prompt: '',
    conversation_flow: '',
    emergency_triggers: [],
    max_retries: 3,
    interruption_sensitivity: 0.5,
    backchannel_enabled: true,
    filler_words_enabled: true
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await agentConfigApi.getAll();
      if (response.data.success) {
        setConfigs(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch agent configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (configData) => {
    try {
      if (editingConfig) {
        const response = await agentConfigApi.update(editingConfig.id, configData);
        if (response.data.success) {
          toast.success('Configuration updated successfully');
          fetchConfigs();
          setEditingConfig(null);
        }
      } else {
        const response = await agentConfigApi.create(configData);
        if (response.data.success) {
          toast.success('Configuration created successfully');
          fetchConfigs();
          setShowCreateForm(false);
        }
      }
    } catch (error) {
      toast.error(editingConfig ? 'Failed to update configuration' : 'Failed to create configuration');
    }
  };

  const handleDelete = async (configId) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await agentConfigApi.delete(configId);
      toast.success('Configuration deleted successfully');
      fetchConfigs();
    } catch (error) {
      toast.error('Failed to delete configuration');
    }
  };

  const ConfigForm = ({ config, onSave, onCancel }) => {
    const [formData, setFormData] = useState(config || defaultConfig);
    const [emergencyTriggerInput, setEmergencyTriggerInput] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
    };

    const addEmergencyTrigger = () => {
      if (emergencyTriggerInput.trim()) {
        setFormData({
          ...formData,
          emergency_triggers: [...formData.emergency_triggers, emergencyTriggerInput.trim()]
        });
        setEmergencyTriggerInput('');
      }
    };

    const removeEmergencyTrigger = (index) => {
      setFormData({
        ...formData,
        emergency_triggers: formData.emergency_triggers.filter((_, i) => i !== index)
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Configuration Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Driver Check-in Agent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Scenario Type
            </label>
            <select
              value={formData.scenario_type}
              onChange={(e) => setFormData({ ...formData, scenario_type: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="check_in">Check-in</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            System Prompt
          </label>
          <textarea
            required
            rows={4}
            value={formData.system_prompt}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="You are a professional dispatch agent..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Conversation Flow
          </label>
          <textarea
            required
            rows={4}
            value={formData.conversation_flow}
            onChange={(e) => setFormData({ ...formData, conversation_flow: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Start with greeting -> Ask for status -> ..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Emergency Triggers
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={emergencyTriggerInput}
              onChange={(e) => setEmergencyTriggerInput(e.target.value)}
              className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add emergency trigger word..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmergencyTrigger())}
            />
            <button
              type="button"
              onClick={addEmergencyTrigger}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.emergency_triggers.map((trigger, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
              >
                {trigger}
                <button
                  type="button"
                  onClick={() => removeEmergencyTrigger(index)}
                  className="ml-1 text-red-600 hover:text-red-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Retries
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.max_retries}
              onChange={(e) => setFormData({ ...formData, max_retries: parseInt(e.target.value) })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Interruption Sensitivity
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.interruption_sensitivity}
              onChange={(e) => setFormData({ ...formData, interruption_sensitivity: parseFloat(e.target.value) })}
              className="mt-1 block w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.interruption_sensitivity}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="backchannel"
                type="checkbox"
                checked={formData.backchannel_enabled}
                onChange={(e) => setFormData({ ...formData, backchannel_enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="backchannel" className="ml-2 block text-sm text-gray-700">
                Backchannel Enabled
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="filler-words"
                type="checkbox"
                checked={formData.filler_words_enabled}
                onChange={(e) => setFormData({ ...formData, filler_words_enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="filler-words" className="ml-2 block text-sm text-gray-700">
                Filler Words Enabled
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2 inline" />
            Save Configuration
          </button>
        </div>
      </form>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Configuration</h2>
          <p className="mt-1 text-sm text-gray-600">
            Configure your AI voice agents for different scenarios
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Configuration
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Create New Configuration
          </h3>
          <ConfigForm
            onSave={handleSave}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Edit Form */}
      {editingConfig && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Edit Configuration
          </h3>
          <ConfigForm
            config={editingConfig}
            onSave={handleSave}
            onCancel={() => setEditingConfig(null)}
          />
        </div>
      )}

      {/* Configurations List */}
      <div className="grid gap-6">
        {configs.map((config) => (
          <div key={config.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {config.name}
                </h3>
                <div className="mt-1 flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    config.scenario_type === 'check_in' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {config.scenario_type === 'check_in' ? 'Check-in' : 'Emergency'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {config.system_prompt}
                </p>
                
                {config.emergency_triggers && config.emergency_triggers.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Emergency Triggers:</p>
                    <div className="flex flex-wrap gap-1">
                      {config.emergency_triggers.map((trigger, index) => (
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
              
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => setEditingConfig(config)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {configs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No agent configurations found.</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first configuration to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default AgentConfig;