export const getEmailTemplate = (content: string, agency?: { name: string, logo?: string }) => {
  const brandName = agency?.name || 'HomeSalesReady';
  const logoUrl = agency?.logo || 'https://vjpkwwhqbvivaxdnydbx.supabase.co/storage/v1/object/public/brand/hsr-logo-white.png'; // Fallback
  const accentColor = '#00e5a0';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            background-color: #0c0c0e;
            color: #ffffff;
            font-family: 'DM Sans', Arial, sans-serif;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            max-height: 40px;
            margin-bottom: 20px;
          }
          .card {
            background-color: #161618;
            border: 1px solid #27272a;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
          }
          .heading {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 16px;
            color: #ffffff;
          }
          .text {
            color: #a1a1aa;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .button {
            display: inline-block;
            background-color: ${accentColor};
            color: #000000;
            padding: 16px 32px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 900;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            color: #52525b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="${brandName}" class="logo">
          </div>
          <div class="card">
            ${content}
          </div>
          <div class="footer">
            &copy; 2026 ${brandName}. All rights reserved.<br>
            Powered by HomeSalesReady UK.
          </div>
        </div>
      </body>
    </html>
  `;
};

export const templates = {
  completion70: (userName: string, propertyAddress: string) => ({
    subject: 'Your property pack is nearly ready',
    html: getEmailTemplate(`
      <h1 class="heading">Great progress, ${userName}!</h1>
      <p class="text">Your property pack for <strong>${propertyAddress}</strong> is 70% complete. You're nearly ready to share it with potential buyers.</p>
      <p class="text">Log in now to complete the final sections and get your property in front of buyers.</p>
      <a href="https://portal.homesalesready.com/login" class="button">Complete My Pack</a>
    `)
  }),
  viewerRegistration: (sellerName: string, viewerData: any, propertyAddress: string, agencyName?: string) => ({
    subject: `New Viewer Registered: ${propertyAddress}`,
    html: getEmailTemplate(`
      <h1 class="heading">New Viewer Registration</h1>
      <p class="text">A potential buyer has just registered to view the pack for <strong>${propertyAddress}</strong>.</p>
      <div style="background: #1e1e20; border-radius: 12px; padding: 20px; text-align: left; margin-bottom: 32px;">
        <p style="margin: 0 0 8px 0; color: #71717a; font-size: 12px; font-weight: bold; text-transform: uppercase;">Viewer Details</p>
        <p style="margin: 0; color: #ffffff; font-size: 16px;"><strong>Name:</strong> ${viewerData.full_name}</p>
        <p style="margin: 8px 0; color: #ffffff; font-size: 16px;"><strong>Email:</strong> ${viewerData.email}</p>
        <p style="margin: 8px 0; color: #ffffff; font-size: 16px;"><strong>Phone:</strong> ${viewerData.phone}</p>
        <p style="margin: 8px 0; color: #ffffff; font-size: 16px;"><strong>Selling:</strong> ${viewerData.is_selling ? 'Yes - ' + viewerData.selling_location : 'No'}</p>
      </div>
      <p class="text">Follow up with them to gauge interest!</p>
    `, { name: agencyName })
  }),
  agentInvite: (sellerName: string, agencyName: string, inviteLink: string) => ({
    subject: `You've been invited by ${agencyName}`,
    html: getEmailTemplate(`
      <h1 class="heading">Hello ${sellerName}!</h1>
      <p class="text"><strong>${agencyName}</strong> has invited you to create a verified property pack on HomeSalesReady.</p>
      <p class="text">Having a verified pack ready upfront makes your home more attractive to buyers and speeds up the sale process.</p>
      <a href="${inviteLink}" class="button">Accept Invitation</a>
    `, { name: agencyName })
  }),
  inactivityReminder: (userName: string, progress: number, propertyAddress: string) => ({
    subject: 'Don\'t let your sale stall',
    html: getEmailTemplate(`
      <h1 class="heading">Hi ${userName},</h1>
      <p class="text">Your property pack for <strong>${propertyAddress}</strong> is ${progress}% complete — don't let your sale stall before it starts.</p>
      <p class="text">Log in and finish your pack today to ensure you're ready when the right buyer comes along.</p>
      <a href="https://portal.homesalesready.com/login" class="button">Finish My Pack</a>
    `)
  })
};
