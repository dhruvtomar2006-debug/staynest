import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/mailer.js';
import { newBookingHostTemplate, bookingStatusGuestTemplate } from '../templates/bookingTemplates.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// POST /api/bookings
export const createBooking = asyncHandler(async (req, res) => {
  const { listingId, checkIn, checkOut, guests } = req.body;

  const listing = await Listing.findById(listingId).populate('host', 'name email');
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDate = new Date(start);
  checkInDate.setHours(0, 0, 0, 0);

  if (checkInDate < today) {
    res.status(400);
    throw new Error('Check-in date cannot be in the past');
  }

  if (guests > listing.maxGuests) {
    res.status(400);
    throw new Error(`This stay allows a maximum of ${listing.maxGuests} guests`);
  }

  if (listing.host._id.equals(req.user._id)) {
    res.status(400);
    throw new Error('You cannot book your own listing');
  }

  const existingBooking = await Booking.findOne({
    listing: listing._id,
    status: { $in: ['pending', 'confirmed'] },
    checkIn: { $lt: end },
    checkOut: { $gt: start },
  });

  if (existingBooking) {
    res.status(409);
    throw new Error('These dates are already booked');
  }

  const booking = await Booking.create({
    listing: listing._id,
    guest: req.user._id,
    checkIn: start,
    checkOut: end,
    guests,
    nights,
    totalPrice: nights * listing.pricePerNight,
  });

  // Non-blocking email notification to host
  if (listing.host && listing.host.email) {
    sendEmail({
      to: listing.host.email,
      subject: `New Booking Request for ${listing.title}`,
      html: newBookingHostTemplate({
        hostName: listing.host.name,
        guestName: req.user.name,
        listingTitle: listing.title,
        checkIn: start,
        checkOut: end,
        guests,
        totalPrice: booking.totalPrice,
      }),
    }).catch((err) => console.error('Email send error:', err.message));
  }

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
  const booking = await Booking.findById(req.params.id)
    .populate('listing', 'title host')
    .populate('guest', 'name email');
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

  // Non-blocking email notification to guest when confirmed or cancelled/declined
  if (['confirmed', 'cancelled'].includes(status) && booking.guest && booking.guest.email) {
    const displayStatus = status === 'cancelled' ? 'declined' : status;
    sendEmail({
      to: booking.guest.email,
      subject: `Booking Request ${displayStatus.toUpperCase()} - ${booking.listing.title}`,
      html: bookingStatusGuestTemplate({
        guestName: booking.guest.name,
        listingTitle: booking.listing.title,
        status: displayStatus,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
      }),
    }).catch((err) => console.error('Email send error:', err.message));
  }

  res.json(booking);
});
