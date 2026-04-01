import { useState, useEffect } from 'react';
import { FiUsers, FiShoppingBag, FiBox, FiDollarSign } from 'react-icons/fi';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/admin/stats');
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="p-8">Loading dashboard...</div>;
  if (!data) return <div className="p-8 text-red-500">Failed to load stats.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Revenue" value={`₹${data.totalRevenue.toLocaleString()}`} icon={FiDollarSign} color="text-green-500" bg="bg-green-100 dark:bg-green-500/20" />
        <MetricCard label="Total Orders" value={data.totalOrders} icon={FiShoppingBag} color="text-blue-500" bg="bg-blue-100 dark:bg-blue-500/20" />
        <MetricCard label="Total Users" value={data.totalUsers} icon={FiUsers} color="text-purple-500" bg="bg-purple-100 dark:bg-purple-500/20" />
        <MetricCard label="Total Products" value={data.totalProducts} icon={FiBox} color="text-yellow-500" bg="bg-yellow-100 dark:bg-yellow-500/20" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Last 30 Days Revenue</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={data.charts.daily.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} minTickGap={30} />
                <YAxis tick={{fontSize: 12}} tickFormatter={v => `₹${v}`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#dcfce7" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Monthly Revenue</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={data.charts.monthly.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="month" tick={{fontSize: 12}} tickMargin={10} />
                <YAxis tick={{fontSize: 12}} tickFormatter={v => `₹${v}`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: 'transparent'}} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Orders</h2>
          <div className="space-y-4">
            {data.recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{o.userName || 'Guest'}</p>
                  <p className="text-xs text-gray-500">#{o.id.slice(-8).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">₹{o.totalAmount?.toLocaleString()}</p>
                  <span className={`badge text-[10px] uppercase ${
                    o.status === 'delivered' ? 'badge-success' : o.status === 'cancelled' || o.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Status Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(data.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{status}</span>
                <div className="flex items-center gap-3 flex-1 ml-4 border-b border-dashed border-gray-200 dark:border-dark-border">
                  <div className="h-2 bg-primary-500 rounded-full" style={{ width: `${(count / data.totalOrders) * 100}%` }} />
                </div>
                <span className="font-bold text-gray-900 dark:text-white ml-4">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
