export const newBookingHostTemplate = ({ hostName, guestName, listingTitle, checkIn, checkOut, guests, totalPrice }) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; color: #333; line-height: 1.5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .header { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 16px; }
    .details { background: #f8fafc; padding: 12px 16px; border-radius: 6px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">🏡 New Booking Request Received</div>
    <p>Hi ${hostName},</p>
    <p>You have a new booking request for <strong>${listingTitle}</strong> from <strong>${guestName}</strong>.</p>
    <div class="details">
      <p><strong>Check-in:</strong> ${new Date(checkIn).toLocaleDateString()}</p>
      <p><strong>Check-out:</strong> ${new Date(checkOut).toLocaleDateString()}</p>
      <p><strong>Guests:</strong> ${guests}</p>
      <p><strong>Total Price:</strong> ₹${totalPrice}</p>
    </div>
    <p>Please log in to your Host Dashboard to confirm or decline this request.</p>
  </div>
</body>
</html>
`;

export const bookingStatusGuestTemplate = ({ guestName, listingTitle, status, checkIn, checkOut }) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; color: #333; line-height: 1.5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .header { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 16px; }
    .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
    .confirmed { background: #dcfce7; color: #166534; }
    .declined { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">🏡 Booking Request ${status.toUpperCase()}</div>
    <p>Hi ${guestName},</p>
    <p>Your booking for <strong>${listingTitle}</strong> (${new Date(checkIn).toLocaleDateString()} – ${new Date(checkOut).toLocaleDateString()}) has been <span class="status ${status}">${status}</span> by the host.</p>
  </div>
</body>
</html>
`;
