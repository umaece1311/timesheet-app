# Daily Time Sheet

A web + mobile-friendly time-and-pay tracker built with **React (Vite) + Firebase**. Sign in with Gmail, manage multiple companies with their hourly rates, log entry/exit times each day, and see a monthly pay tracker broken down by company.

## Features

- **Sign in with Google** (Gmail) — Firebase Auth.
- **Multiple companies** — each with its own hourly wage.
- **Daily time entries** — entry time, exit time, automatic hours and pay calculation.
- **Monthly pay tracker** — pick any month/year, see totals and per-company breakdown.
- **Cloud storage** — Firestore. Data syncs across phone and laptop.
- **Responsive** — sidebar layout on desktop, bottom-nav on mobile. Dark mode auto.
- **Private** — Firestore security rules ensure each user only sees their own data.

## One-time Firebase setup (≈ 5 minutes)

1. Go to https://console.firebase.google.com and click **Add project** (give it any name, e.g. `my-timesheet`).
2. In the project, click **Build → Authentication → Get started**, then enable **Google** as a sign-in provider. Set a project support email and save.
3. Click **Build → Firestore Database → Create database**, choose a region, and start in **production mode**.
4. Click the gear icon → **Project settings → General**. Under **Your apps**, click the web icon (`</>`) and register a web app. Copy the `firebaseConfig` values that appear.
5. In this project's folder, copy `.env.example` to `.env` and paste each value:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 on your laptop. To test on your phone, use the second URL Vite prints (e.g. `http://192.168.x.x:5173`) — phone must be on the same Wi-Fi.

## Apply Firestore security rules

So each user only sees their own data:

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # select your project
firebase deploy --only firestore:rules
```

The rules in `firestore.rules` restrict reads/writes to the authenticated owner.

## Deploy to the web (free Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting
```

Firebase will give you a URL like `https://my-timesheet.web.app`. Open it on any phone or computer — install it as a PWA via the browser's "Add to Home Screen" for an app-like experience.

> The first deploy will prompt `firebase init` to ask about hosting; choose `dist` as the public directory and answer **Yes** to "Configure as a single-page app." (It's already pre-set in `firebase.json`.)

## Project structure

```
timesheet-app/
├── public/clock.svg
├── src/
│   ├── components/Layout.jsx        # Top bar, sidebar (desktop), bottom-nav (mobile)
│   ├── lib/firebase.js              # Firebase init + Firestore helpers + math
│   ├── lib/auth-context.jsx         # React context for the signed-in user
│   ├── screens/Login.jsx            # Google sign-in page
│   ├── screens/Dashboard.jsx        # Monthly pay tracker
│   ├── screens/TimeEntry.jsx        # Log a day's hours
│   ├── screens/Companies.jsx        # Add/edit companies + hourly wage
│   ├── App.jsx                      # Routing
│   ├── main.jsx                     # Entry point
│   └── styles.css                   # Responsive styles, dark-mode aware
├── firebase.json
├── firestore.rules                  # Per-user data isolation
├── vite.config.js
├── package.json
└── .env.example
```

## Data model (Firestore)

```
users/{uid}                          { email, displayName, photoURL, lastLoginAt }
users/{uid}/companies/{companyId}    { name, hourlyWage, createdAt }
users/{uid}/entries/{entryId}        { companyId, companyName, hourlyWage,
                                       date (YYYY-MM-DD), entryTime, exitTime,
                                       hours, pay, createdAt }
```

## Notes

- Hours math handles overnight shifts automatically (e.g. 22:00 → 06:00 = 8 hrs).
- Deleting a company keeps existing logged entries (each entry stores its own `companyName` and `hourlyWage` snapshot).
- Currency symbols are displayed as `$`. To change to ₹, €, £, etc., edit the prefix in `Dashboard.jsx`, `TimeEntry.jsx`, and `Companies.jsx`.
