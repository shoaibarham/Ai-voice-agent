import React, { useState, useEffect } from 'react';
import { dashboardApi, callsApi } from '../services/api';
import { Phone, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_calls: 0,
    completed_calls: 0,
    in_progress_calls: 0,
    failed_calls: 0
  });
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardApi.getStats();
      if (response.data.success) {
        setStats(response.data.data.stats);
        setRecentCalls(response.data.data.recent_calls);
      }
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className={`${bgColor} rounded-lg p-6 shadow-sm`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${color}`}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-3xl font-semibold text-gray-900">
              {value}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );

  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      in_progress: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      initiated: { color: 'bg-yellow-100 text-yellow-800', label: 'Initiated' }
    };
    
    const badge = badges[status] || badges.initiated;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your AI voice agent activities
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={stats.total_calls}
          icon={Phone}
          color="text-blue-600"
          bgColor="bg-white"
        />
        <StatCard
          title="Completed"
          value={stats.completed_calls}
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-white"
        />
        <StatCard
          title="In Progress"
          value={stats.in_progress_calls}
          icon={Clock}
          color="text-blue-600"
          bgColor="bg-white"
        />
        <StatCard
          title="Failed"
          value={stats.failed_calls}
          icon={XCircle}
          color="text-red-600"
          bgColor="bg-white"
        />
      </div>

      {/* Success Rate */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Success Rate
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-3xl font-semibold text-gray-900">
                    {stats.total_calls > 0 
                      ? Math.round((stats.completed_calls / stats.total_calls) * 100)
                      : 0}%
                  </div>
                  <div className="ml-2 flex items-baseline text-sm text-gray-600">
                    <span>of total calls</span>
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Calls
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Latest call activities
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentCalls.length === 0 ? (
            <li className="px-4 py-5 text-center text-gray-500">
              No recent calls found
            </li>
          ) : (
            recentCalls.map((call) => (
              <li key={call.id} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {call.driver_name} - Load #{call.load_number}
                        </div>
                        <div className="ml-2">
                          {getStatusBadge(call.call_status)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Agent: {call.agent_configs?.name || 'Unknown'} • {formatDateTime(call.started_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => window.location.href = `#call-${call.id}`}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;