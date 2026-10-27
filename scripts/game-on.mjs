// Sends "Game on tonight" once 3 or more people say I'm in for today.
// Only the people who are in get it, it's sent at most once per night, and never at 22:00 or later.
// Run every 15 minutes by GitHub Actions (.github/workflows/game-on.yml). Needs:
//   FIREBASE_SERVICE_ACCOUNT  the service account JSON (a GitHub secret)
//   APP_URL                   where the app lives, e.g. https://you.github.io/squad-check-in/
//   TIMEZONE                  optional, defaults to Atlantic/Reykjavik
import admin from "firebase-admin";

const MIN_PLAYERS = 3;
const LAST_HOUR = 22; // nothing is sent from 22:00 on

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
const appUrl = process.env.APP_URL;
const timeZone = process.env.TIMEZONE || "Atlantic/Reykjavik";
if (!serviceAccount.project_id || !appUrl) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT or APP_URL.");
  process.exit(1);
}

const now = new Date();
const hour = Number(now.toLocaleString("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }));
if (hour >= LAST_HOUR) {
  console.log(`It's after ${LAST_HOUR}:00, not sending.`);
  process.exit(0);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const todayKey = now.toLocaleDateString("en-CA", { timeZone });

// Already sent tonight? Then stay quiet.
const flag = db.collection("gameOn").doc(todayKey);
if ((await flag.get()).exists) {
  console.log("Game on was already sent tonight.");
  process.exit(0);
}

const timeKey = (from) => from === "now" ? "00" : (from || "99");
const players = await db.collection("players").get();
const inTonight = players.docs
  .map((d) => ({ id: d.id, nick: (d.data().nick || "").trim(), from: d.data().days?.[todayKey]?.from, s: d.data().days?.[todayKey]?.s }))
  .filter((p) => p.s === "yes")
  .sort((a, b) => timeKey(a.from).localeCompare(timeKey(b.from)));

if (inTonight.length < MIN_PLAYERS) {
  console.log(`${inTonight.length} in tonight, need ${MIN_PLAYERS}.`);
  process.exit(0);
}

const names = inTonight.map((p) => p.nick || "Someone");
const who = names.length <= 3
  ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)} are in.`
  : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more are in.`;
const first = inTonight.find((p) => p.from);
const when = !first ? "" : first.from === "now" ? ` ${first.nick || "Someone"} is on now.` : ` First one on at ${first.from}.`;

const tokens = await Promise.all(inTonight.map((p) => db.collection("tokens").doc(p.id).get()));
const targets = tokens.filter((t) => t.exists && t.get("token"));

// Mark it sent before sending, so a slow or repeated run can't send twice.
await flag.set({ sentAt: Date.now(), count: inTonight.length });

if (!targets.length) {
  console.log("Game on, but nobody who's in has reminders turned on.");
  process.exit(0);
}

const res = await admin.messaging().sendEach(targets.map((t) => ({
  token: t.get("token"),
  webpush: {
    notification: {
      title: "Game on tonight 🎮",
      body: who + when,
      icon: new URL("icon-192.png", appUrl).href,
      tag: "squad-game-on",
    },
  },
})));

const stale = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"];
await Promise.all(res.responses.map((r, i) =>
  !r.success && stale.includes(r.error?.code) ? targets[i].ref.delete() : null));

console.log(`Game on: ${inTonight.length} in. Sent ${res.successCount}, failed ${res.failureCount}.`);
