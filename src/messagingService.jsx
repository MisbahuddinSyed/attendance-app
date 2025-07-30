import axios from 'axios';

export const sendMessage = async (phone, message) => {
  const cleanedPhone = phone.replace(/\D/g, ''); // Remove non-digits

  if (process.env.REACT_APP_MESSAGING_PROVIDER === "TWILIO") {
    // Twilio API call
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.REACT_APP_TWILIO_ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        To: `whatsapp:${cleanedPhone}`,
        From: 'whatsapp:+14155238886', // Twilio sandbox number
        Body: message
      }),
      {
        auth: {
          username: process.env.REACT_APP_TWILIO_ACCOUNT_SID,
          password: process.env.REACT_APP_TWILIO_AUTH_TOKEN
        }
      }
    );
    return response.data.sid;
  }
  // WASENDER code will be added later
};