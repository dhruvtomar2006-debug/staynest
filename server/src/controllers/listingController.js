import Listing from '../models/Listing.js';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /api/listings?city=&type=&minPrice=&maxPrice=&guests=
// NOTE: no pagination yet, and checkIn/checkOut availability filter is not implemented.
export const getListings = asyncHandler(async (req, res) => {
  const { city, type, minPrice, maxPrice, guests } = req.query;
  const filter = { isActive: true };

  if (city) filter.city = new RegExp(`^${city}`, 'i');
  if (type) filter.type = type;
  if (guests) filter.maxGuests = { $gte: Number(guests) };
  if (minPrice || maxPrice) {
    filter.pricePerNight = {};
    if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
  }

  const listings = await Listing.find(filter).populate('host', 'name').sort({ createdAt: -1 });
  res.json(listings);
});

// GET /api/listings/mine (host)
export const getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ host: req.user._id }).sort({ createdAt: -1 });
  res.json(listings);
});

// GET /api/listings/:id
export const getListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate('host', 'name avatar createdAt');
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }
  res.json(listing);
});

// POST /api/listings (host)
export const createListing = asyncHandler(async (req, res) => {
  const listing = await Listing.create({ ...req.body, host: req.user._id });
  res.status(201).json(listing);
});

const findOwnedListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }
  if (!listing.host.equals(req.user._id)) {
    res.status(403);
    throw new Error('You can only manage your own listings');
  }
  return listing;
};

// PUT /api/listings/:id (owner host)
export const updateListing = asyncHandler(async (req, res) => {
  const listing = await findOwnedListing(req, res);
  const { host, avgRating, reviewCount, ...updates } = req.body; // protected fields
  Object.assign(listing, updates);
  await listing.save();
  res.json(listing);
});

// DELETE /api/listings/:id (owner host)
export const deleteListing = asyncHandler(async (req, res) => {
  const listing = await findOwnedListing(req, res);
  await listing.deleteOne();
  // TODO: what should happen to existing bookings and reviews? See issue tracker.
  res.json({ message: 'Listing deleted' });
});

export const recalculateListingRating = async (listingId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) return;

  const stats = await Review.aggregate([
    { $match: { listing: listing._id } },
    { $group: { _id: '$listing', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (stats.length > 0) {
    listing.avgRating = Math.round(stats[0].avg * 10) / 10;
    listing.reviewCount = stats[0].count;
  } else {
    listing.avgRating = 0;
    listing.reviewCount = 0;
  }
  await listing.save();
};

// GET /api/listings/:id/reviews
export const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ listing: req.params.id })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });
  res.json(reviews);
});

// POST /api/listings/:id/reviews
export const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }

  // Only guests who have stayed (completed booking) can review
  const stayed = await Booking.exists({
    listing: listing._id,
    guest: req.user._id,
    status: 'completed',
  });
  if (!stayed) {
    res.status(403);
    throw new Error('You can review only after completing a stay');
  }

  const existingReview = await Review.exists({
    listing: listing._id,
    user: req.user._id,
  });
  if (existingReview) {
    res.status(400);
    throw new Error('You have already reviewed this stay');
  }

  const review = await Review.create({ listing: listing._id, user: req.user._id, rating, comment });

  await recalculateListingRating(listing._id);

  res.status(201).json(review);
});

// PUT /api/listings/:id/reviews/:reviewId (author only)
export const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const review = await Review.findById(req.params.reviewId);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }
  if (!review.user.equals(req.user._id)) {
    res.status(403);
    throw new Error('You can only edit your own review');
  }
  review.rating = rating || review.rating;
  review.comment = comment !== undefined ? comment : review.comment;
  await review.save();

  await recalculateListingRating(review.listing);
  res.json(review);
});

// DELETE /api/listings/:id/reviews/:reviewId (author only)
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }
  if (!review.user.equals(req.user._id)) {
    res.status(403);
    throw new Error('You can only delete your own review');
  }
  const listingId = review.listing;
  await review.deleteOne();

  await recalculateListingRating(listingId);
  res.json({ message: 'Review deleted' });
});
