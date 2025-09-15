import React, { useState, useEffect } from 'react';
import { callsApi } from '../services/api';
import { Phone, Clock, MapPin, AlertTriangle, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const CallResults = () => {
  const [calls, setCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const response = await callsApi.getAll();
      if (response.data.success) {
        setCalls(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch calls');
    } finally {
      setLoading(false);
    }
  };

  const fetchCallDetails = async (callId) => {
    setDetailsLoading(true);
    try {
      const response = await callsApi.getById(callId);
      if (response.data.success) {
        setSelectedCall(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch call details');
      setSelectedCall(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'In Progress' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Failed' },
      initiated: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Initiated' }
    };
    
    const badge = badges[status] || badges.initiated;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const getOutcomeBadge = (outcome) => {
    if (!outcome) return null;
    
    const badges = {
      'In-Transit Update': { color: 'bg-blue-100 text-blue-800', icon: MapPin },
      'Arrival Confirmation': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'Emergency Detected': { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      'Uncooperative Driver': { color: 'bg-orange-100 text-orange-800', icon: XCircle },
      'Call Failed': { color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const badge = badges[outcome] || { color: 'bg-gray-100 text-gray-800', icon: Phone };
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {outcome}
      </span>
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const CallDetailModal = ({ call, onClose }) => {
    if (!call) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Call Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
          
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {detailsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Call Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Call Information</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Driver</dt>
                        <dd className="text-sm text-gray-900">{call.call_info.driver_name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="text-sm text-gray-900">{call.call_info.driver_phone}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Load Number</dt>
                        <dd className="text-sm text-gray-900">{call.call_info.load_number}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Agent</dt>
                        <dd className="text-sm text-gray-900">{call.call_info.agent_name}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Call Timing</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Started</dt>
                        <dd className="text-sm text-gray-900">{formatDateTime(call.call_info.started_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Ended</dt>
                        <dd className="text-sm text-gray-900">{formatDateTime(call.call_info.ended_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Duration</dt>
                        <dd className="text-sm text-gray-900">{formatDuration(call.call_info.duration)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="text-sm text-gray-900">
                          {getStatusBadge(call.call_info.call_status)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Structured Results */}
                {call.results && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Call Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Call Outcome</dt>
                        <dd className="mt-1">
                          {getOutcomeBadge(call.results.call_outcome)}
                        </dd>
                      </div>
                      
                      {call.results.driver_status && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Driver Status</dt>
                          <dd className="text-sm text-gray-900">{call.results.driver_status}</dd>
                        </div>
                      )}
                      
                      {call.results.current_location && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Current Location</dt>
                          <dd className="text-sm text-gray-900">{call.results.current_location}</dd>
                        </div>
                      )}
                      
                      {call.results.eta && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">ETA</dt>
                          <dd className="text-sm text-gray-900">{call.results.eta}</dd>
                        </div>
                      )}
                      
                      {call.results.emergency_type && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Emergency Type</dt>
                          <dd className="text-sm text-red-900 font-medium">{call.results.emergency_type}</dd>
                        </div>
                      )}
                      
                      {call.results.emergency_location && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Emergency Location</dt>
                          <dd className="text-sm text-red-900 font-medium">{call.results.emergency_location}</dd>
                        </div>
                      )}
                      
                      {call.results.escalation_status && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Escalation Status</dt>
                          <dd className="text-sm text-red-900 font-medium">{call.results.escalation_status}</dd>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full Transcript */}
                {call.transcript && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Full Transcript</h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {call.transcript}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Structured Data (JSON) */}
                {call.structured_data && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Raw Structured Data</h4>
                    <div className="bg-gray-900 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <pre className="text-sm text-green-400 whitespace-pre-wrap">
                        {JSON.stringify(call.structured_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
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
          <h2 className="text-2xl font-bold text-gray-900">Call Results</h2>
          <p className="mt-1 text-sm text-gray-600">
            View and analyze completed call results
          </p>
        </div>
        <button
          onClick={fetchCalls}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Calls List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {calls.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No calls found. Start a test call to see results here.
            </li>
          ) : (
            calls.map((call) => (
              <li key={call.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {call.driver_name} - Load #{call.load_number}
                          </p>
                          <p className="text-sm text-gray-500">
                            {call.driver_phone} • Agent: {call.agent_configs?.name}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(call.call_status)}
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          Started: {formatDateTime(call.started_at)}
                          {call.duration && (
                            <span className="ml-4">
                              Duration: {formatDuration(call.duration)}
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => fetchCallDetails(call.id)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Call Details Modal */}
      {selectedCall && (
        <CallDetailModal 
          call={selectedCall} 
          onClose={() => setSelectedCall(null)} 
        />
      )}
    </div>
  );
};

export default CallResults;