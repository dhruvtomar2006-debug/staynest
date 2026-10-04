import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';
import asyncHandler from '../utils/asyncHandler.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// POST /api/bookings
export const createBooking = asyncHandler(async (req, res) => {
  const { listingId, checkIn, checkOut, guests } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing || !listing.isActive) {
    res.status(404);
    throw new Error('Listing not available');
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.round((end - start) / MS_PER_DAY);

  if (Number.isNaN(nights) || nights < 1) {
    res.status(400);
    throw new Error('Check-out must be at least one day after check-in');
  }
  // TODO: reject check-in dates in the past.

  if (guests > listing.maxGuests) {
    res.status(400);
    throw new Error(`This stay allows a maximum of ${listing.maxGuests} guests`);
  }

  if (listing.host.equals(req.user._id)) {
    res.status(400);
    throw new Error('You cannot book your own listing');
  }

  // BUG: there is no check for overlapping bookings, so the same
  // dates can be booked twice. See "Prevent double booking" issue.

  const booking = await Booking.create({
    listing: listing._id,
    guest: req.user._id,
    checkIn: start,
    checkOut: end,
    guests,
    nights,
    totalPrice: nights * listing.pricePerNight,
  });

  res.status(201).json(booking);
});

// GET /api/bookings/mine (guest trips)
export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ guest: req.user._id })
    .populate('listing', 'title city images pricePerNight')
    .sort({ checkIn: -1 });
  res.json(bookings);
});

// GET /api/bookings/host (bookings on my listings)
export const getHostBookings = asyncHandler(async (req, res) => {
  const myListings = await Listing.find({ host: req.user._id }).select('_id');
  const bookings = await Booking.find({ listing: { $in: myListings.map((l) => l._id) } })
    .populate('listing', 'title city')
    .populate('guest', 'name email')
    .sort({ checkIn: 1 });
  res.json(bookings);
});

// PATCH /api/bookings/:id/cancel (guest)
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (!booking.guest.equals(req.user._id)) {
    res.status(403);
    throw new Error('Not your booking');
  }
  if (['cancelled', 'completed'].includes(booking.status)) {
    res.status(400);
    throw new Error(`Booking is already ${booking.status}`);
  }
  booking.status = 'cancelled';
  await booking.save();
  res.json(booking);
});

// PATCH /api/bookings/:id/status (host of the listing)
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id).populate('listing', 'host');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (!booking.listing.host.equals(req.user._id)) {
    res.status(403);
    throw new Error('Not a booking on your listing');
  }
  if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }
  booking.status = status;
  await booking.save();
  res.json(booking);
});

// GET /api/bookings/host/stats (host)
export const getHostStats = asyncHandler(async (req, res) => {
  const myListings = await Listing.find({ host: req.user._id }).select('_id avgRating reviewCount');
  const listingIds = myListings.map((l) => l._id);

  // 1. Total earnings from completed bookings
  const earningsResult = await Booking.aggregate([
    { $match: { listing: { $in: listingIds }, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  const totalEarnings = earningsResult[0]?.total || 0;

  // 2. Upcoming check-ins in the next 7 days
  const now = new Date();
  const next7Days = new Date();
  next7Days.setDate(now.getDate() + 7);

  const upcomingCheckIns = await Booking.countDocuments({
    listing: { $in: listingIds },
    status: 'confirmed',
    checkIn: { $gte: now, $lte: next7Days },
  });

  // 3. Pending requests count
  const pendingRequests = await Booking.countDocuments({
    listing: { $in: listingIds },
    status: 'pending',
  });

  // 4. Average rating across all listings with reviews
  const listingsWithReviews = myListings.filter((l) => l.reviewCount > 0);
  const avgRating = listingsWithReviews.length > 0
    ? Math.round((listingsWithReviews.reduce((acc, curr) => acc + curr.avgRating, 0) / listingsWithReviews.length) * 10) / 10
    : 0;

  res.json({
    totalEarnings,
    upcomingCheckIns,
    pendingRequests,
    avgRating,
  });
});
