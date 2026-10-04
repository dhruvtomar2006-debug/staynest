import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client.js';
import Loader from '../../components/Loader.jsx';
import { formatDate, formatINR } from '../../utils/format.js';

export default function HostDashboard() {
  const [listings, setListings] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([api.get('/listings/mine'), api.get('/bookings/host'), api.get('/bookings/host/stats')])
      .then(([l, b, s]) => {
        setListings(l.data);
        setBookings(b.data);
        setStats(s.data);
      })
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id, status) => {
    await api.patch(`/bookings/${id}/status`, { status });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    await api.delete(`/listings/${id}`);
    load();
  };

  if (error) return <p className="error">{error}</p>;
  if (!listings) return <Loader />;

  return (
    <section>
      <div className="row-between">
        <h1>Host Dashboard</h1>
        <Link to="/host/listings/new" className="btn">+ New listing</Link>
      </div>

      {stats && (
        <div className="stats-grid grid col-4 margin-bottom-l" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', margin: '20px 0' }}>
          <div className="card stat-card" style={{ padding: '16px' }}>
            <span className="muted small">Total Earnings</span>
            <h2 style={{ margin: '8px 0 0' }}>{formatINR(stats.totalEarnings)}</h2>
          </div>
          <div className="card stat-card" style={{ padding: '16px' }}>
            <span className="muted small">Upcoming Check-ins (7d)</span>
            <h2 style={{ margin: '8px 0 0' }}>{stats.upcomingCheckIns}</h2>
          </div>
          <div className="card stat-card" style={{ padding: '16px' }}>
            <span className="muted small">Pending Requests</span>
            <h2 style={{ margin: '8px 0 0' }}>{stats.pendingRequests}</h2>
          </div>
          <div className="card stat-card" style={{ padding: '16px' }}>
            <span className="muted small">Average Rating</span>
            <h2 style={{ margin: '8px 0 0' }}>⭐ {stats.avgRating || 'N/A'}</h2>
          </div>
        </div>
      )}

      <h2>Booking requests</h2>
      {bookings.length === 0 && <p className="muted">No bookings yet.</p>}
      {bookings.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Guest</th><th>Stay</th><th>Dates</th><th>Total</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.guest?.name}<br /><span className="muted small">{b.guest?.email}</span></td>
                <td>{b.listing?.title}</td>
                <td>{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
                <td>{formatINR(b.totalPrice)}</td>
                <td><span className={`status status-${b.status}`}>{b.status}</span></td>
                <td className="row">
                  {b.status === 'pending' && (
                    <>
                      <button className="btn" onClick={() => setStatus(b._id, 'confirmed')}>Accept</button>
                      <button className="btn btn-ghost" onClick={() => setStatus(b._id, 'cancelled')}>Decline</button>
                    </>
                  )}
                  {b.status === 'confirmed' && (
                    <button className="btn btn-ghost" onClick={() => setStatus(b._id, 'completed')}>Mark completed</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>My listings ({listings.length})</h2>
      <div className="grid">
        {listings.map((l) => (
          <div key={l._id} className="card">
            <img src={l.images[0]} alt={l.title} className="thumb" />
            <div className="card-body">
              <strong>{l.title}</strong>
              <span className="muted">{l.city} · {formatINR(l.pricePerNight)}/night</span>
              <div className="row">
                <Link to={`/host/listings/${l._id}/edit`} className="btn btn-ghost">Edit</Link>
                <button className="btn btn-danger" onClick={() => remove(l._id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
