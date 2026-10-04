import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import StarRating from './StarRating.jsx';
import { formatDate } from '../utils/format.js';

export default function Reviews({ listingId, onReviewAdded }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: '' });
  const [error, setError] = useState('');

  const load = () => api.get(`/listings/${listingId}/reviews`).then(({ data }) => setReviews(data));
  useEffect(() => {
    load();
  }, [listingId]);

  const userReview = user ? reviews.find((r) => (r.user?._id || r.user) === user._id) : null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/listings/${listingId}/reviews`, form);
      setForm({ rating: 5, comment: '' });
      load();
      onReviewAdded?.();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const startEdit = (review) => {
    setEditingId(review._id);
    setEditForm({ rating: review.rating, comment: review.comment });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (e, reviewId) => {
    e.preventDefault();
    try {
      await api.put(`/listings/${listingId}/reviews/${reviewId}`, editForm);
      setEditingId(null);
      load();
      onReviewAdded?.();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await api.delete(`/listings/${listingId}/reviews/${reviewId}`);
      load();
      onReviewAdded?.();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section className="reviews">
      <h2>Reviews ({reviews.length})</h2>
      {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      {reviews.map((r) => {
        const isAuthor = user && (r.user?._id || r.user) === user._id;
        const isEditing = editingId === r._id;

        return (
          <div key={r._id} className="review">
            <div className="row-between">
              <strong>{r.user?.name}</strong>
              <div className="row gap-s align-center">
                <span className="muted small">{formatDate(r.createdAt)}</span>
                {isAuthor && !isEditing && (
                  <div className="actions small" style={{ display: 'inline-flex', gap: '8px', marginLeft: '8px' }}>
                    <button type="button" className="btn-link" onClick={() => startEdit(r)}>Edit</button>
                    <button type="button" className="btn-link error" onClick={() => handleDelete(r._id)}>Delete</button>
                  </div>
                )}
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={(e) => handleUpdate(e, r._id)} className="edit-review-form" style={{ marginTop: '8px' }}>
                <StarRating value={editForm.rating} onChange={(rating) => setEditForm({ ...editForm, rating })} />
                <textarea
                  required
                  value={editForm.comment}
                  onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                  style={{ width: '100%', marginTop: '8px' }}
                />
                <div className="row gap-s margin-top-s" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button className="btn small" type="submit">Save</button>
                  <button className="btn outline small" type="button" onClick={cancelEdit}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div className="stars-static">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                <p>{r.comment}</p>
              </>
            )}
          </div>
        );
      })}

      {user && !userReview && (
        <form className="card form" onSubmit={submit}>
          <h3>Write a review</h3>
          <StarRating value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          <textarea
            required
            placeholder="How was your stay?"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
          {error && <p className="error">{error}</p>}
          <button className="btn">Submit review</button>
        </form>
      )}
    </section>
  );
}
