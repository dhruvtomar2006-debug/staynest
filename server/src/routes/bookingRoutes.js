import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getHostBookings,
  cancelBooking,
  updateBookingStatus,
  getHostStats,
} from '../controllers/bookingController.js';
import { protect, hostOnly } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.post('/', createBooking);
router.get('/mine', getMyBookings);
router.get('/host', hostOnly, getHostBookings);
router.get('/host/stats', hostOnly, getHostStats);
router.patch('/:id/cancel', cancelBooking);
router.patch('/:id/status', hostOnly, updateBookingStatus);

export default router;
