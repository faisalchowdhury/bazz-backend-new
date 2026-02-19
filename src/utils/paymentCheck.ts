import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "../config";

// Initialize the Stripe instance with your secret key
const stripe = new Stripe(STRIPE_SECRET_KEY);

export async function verifyTransaction(transactionId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);
    return paymentIntent;
  } catch (error) {
    throw error; // Handle the error accordingly
  }
}

// Example usage: Replace 'your_transaction_id' with the actual transaction ID
verifyTransaction("your_transaction_id")
  .then((paymentIntent) => {
    // Further process the paymentIntent if needed
  })
  .catch((error) => {
    // Handle errors, if any
  });
