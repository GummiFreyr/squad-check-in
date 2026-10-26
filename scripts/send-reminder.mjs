// Sends the daily "Can you play tonight?" notification to everyone who turned reminders on.
// Run by GitHub Actions (.github/workflows/daily-reminder.yml). Needs:
//   FIREBASE_SERVICE_ACCOUNT  the service account JSON (a GitHub secret)
//   APP_URL                   where the app lives, e.g. https://you.github.io/squad-check-in/
//   TIMEZONE                  optional, defaults to Atlantic/Reykjavik
import admin from "firebase-admin";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
const appUrl = process.env.APP_URL;
const timeZone = process.env.TIMEZONE || "Atlantic/Reykjavik";
if (!serviceAccount.project_id || !appUrl) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT or APP_URL.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Today's date as YYYY-MM-DD in the squad's time zone, matching the app's keys.
const todayKey = new Date().toLocaleDateString("en-CA", { timeZone });

const players = await db.collection("players").get();
const answers = {};
players.forEach((d) => { answers[d.id] = d.data().days?.[todayKey]?.s || null; });
const inCount = Object.values(answers).filter((s) => s === "yes").length;

const tokens = await db.collection("tokens").get();
// Only remind people who haven't answered for today yet.
const targets = tokens.docs.filter((d) => !answers[d.id] && d.get("token"));
if (!targets.length) {
  console.log("Nobody to remind today.");
  process.exit(0);
}

const body = inCount === 0
  ? "Nobody's answered yet. Tap to check in."
  : `${inCount} ${inCount === 1 ? "is" : "are"} in so far. Tap to check in.`;

const res = await admin.messaging().sendEach(targets.map((d) => ({
  token: d.get("token"),
  webpush: {
    notification: {
      title: "Can you play tonight? 🎮",
      body,
      icon: new URL("icon-192.png", appUrl).href,
      tag: "squad-daily",
    },
  },
})));

// Drop tokens for phones that uninstalled the app or turned notifications off.
const stale = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"];
await Promise.all(res.responses.map((r, i) =>
  !r.success && stale.includes(r.error?.code) ? targets[i].ref.delete() : null));

console.log(`Sent ${res.successCount}, failed ${res.failureCount}.`);
