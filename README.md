# Caspian Tandoori MERN Website

Full-stack takeaway website using:

- React + Vite frontend
- Node.js + Express backend
- MongoDB + Mongoose database
- JWT authentication
- User profile editing
- Saved delivery addresses
- Basket/order creation
- Demo Google sign-in endpoint

## 1. Backend setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Edit `server/.env` and add your MongoDB connection string.

## 2. Frontend setup

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## MongoDB

Create a free MongoDB Atlas cluster, then put your URI in:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/caspian_tandoori
```

## Important

The Google sign-in included is a demo route. For production, connect Firebase Auth or Google Identity Services and verify the Google ID token on the backend.
