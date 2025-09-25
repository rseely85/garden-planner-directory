import { NextApiRequest, NextApiResponse } from 'next';
// import Stripe from 'stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      // TODO: Initialize Stripe checkout session for premium supplier listing
      res.status(200).json({ message: 'TODO: Stripe checkout not implemented yet' });
    } catch (err) {
      res.status(500).json({ error: 'Something went wrong' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
