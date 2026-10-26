# Squad Check-in

A tiny phone app for your gaming squad. Every day at 17:00 everyone who hasn't
answered yet gets a notification: **Can you play tonight?** They tap it, press
**I'm in**, **Maybe** or **Can't**, and see who else is coming online.

It's all free:

- **Firebase** (Google) keeps the answers and sends the notifications.
- **GitHub Pages** hosts the app.
- **GitHub Actions** sends the daily reminder.

Setup takes about 30–45 minutes, and only you have to do it.

---

## 1. Firebase: the database and notifications

1. Go to <https://console.firebase.google.com>, sign in with Google and click
   **Create a project**. Name it something like `squad-check-in`. You can turn
   Google Analytics off.
2. **Add a web app:** on the project home page, click the **</>** (Web) icon and
   give it any name. Don't tick "Firebase Hosting". Firebase then shows a block
   of code with `firebaseConfig = { apiKey: ..., ... }`. Copy those six values into
   `config.js` in this folder, replacing each `PASTE_HERE`.
3. **Turn on sign-in:** left menu → **Build → Authentication → Get started →
   Sign-in method → Anonymous → Enable → Save**. Your friends never type a
   password; each phone just gets its own ID.
4. **Create the database:** left menu → **Build → Firestore Database → Create
   database**. Pick a location near you (for example `eur3`) and choose
   **production mode**. Then open the **Rules** tab, replace everything with
   the contents of `firestore.rules`, and click **Publish**.
5. **Notification key:** click the ⚙️ gear → **Project settings → Cloud Messaging**.
   Under **Web Push certificates**, click **Generate key pair**. Copy the long
   key into `config.js` as `vapidKey`.
6. **Key for the daily reminder:** still in Project settings, open **Service
   accounts → Generate new private key**. A `.json` file downloads. Keep it
   secret: **don't** put it in this folder or upload it anywhere except
   step 3 below.

## 2. GitHub: put the app online

1. Make a free account at <https://github.com> if you don't have one.
2. Click **+ → New repository**. Name it `squad-check-in`, choose **Public**
   (free Pages needs that) and click **Create repository**.
3. On the new repo page, click **uploading an existing file**. In Finder, open
   this folder and press **Cmd + Shift + .** so you can see the hidden
   `.github` folder. Select **everything** in the folder, `.github` included,
   drag it into the browser and click **Commit changes**.
   - Check that the repo now shows a `.github` folder. If it doesn't, click
     **Add file → Create new file**, name it
     `.github/workflows/daily-reminder.yml` and paste in that file's contents.
4. **Turn on the website:** repo → **Settings → Pages**. Under "Build and
   deployment", pick **Deploy from a branch**, branch **main**, folder **/ (root)**,
   then **Save**. After a minute your app is live at
   `https://YOUR-USERNAME.github.io/squad-check-in/`.

## 3. Hook up the daily reminder

In the repo, go to **Settings → Secrets and variables → Actions**:

1. **Secrets** tab → **New repository secret**. Name: `FIREBASE_SERVICE_ACCOUNT`.
   Value: open the `.json` file from step 1.6 in TextEdit, copy **all** of it and
   paste it in. Save.
2. **Variables** tab → **New repository variable**. Name: `APP_URL`.
   Value: your app link from step 2.4, for example
   `https://YOUR-USERNAME.github.io/squad-check-in/`.

**Test it:** open the repo's **Actions** tab, click **Daily reminder** on the left,
then **Run workflow**. A phone with reminders turned on should buzz within
a minute. (You need to do step 4 on your own phone first.)

To change the time, edit `.github/workflows/daily-reminder.yml`. The cron
line uses UTC, which is the same as Iceland time: `"0 17 * * *"` means 17:00,
and `"30 18 * * *"` would mean 18:30.

## 4. Everyone installs it on their phone

Send the squad the app link (step 2.4) in your Snapchat group. Then each person:

**iPhone** (needs iOS 16.4 or newer)
1. Open the link in **Safari**.
2. Tap **Share** (the square with an arrow) → **Add to Home Screen** → **Add**.
3. Open **Squad** from the home screen, not from Safari. Notifications only
   work this way.
4. Tap **Turn on daily reminder** → **Allow**, then enter a gamertag.

**Android**
1. Open the link in **Chrome**.
2. Tap **⋮ → Add to Home screen** (or **Install app**).
3. Open it, tap **Turn on daily reminder** → **Allow**, and enter a gamertag.

---

### Good to know
- People who have already answered for today don't get the reminder.
- Each phone counts as one person. If someone deletes the app and adds it again,
  they show up as a new person. Their old entry only appears on days it already
  answered for.
- Answers older than two weeks are cleaned up automatically.
- `config.js` is safe to have public. The service account `.json` is **not**: it
  only belongs in the GitHub secret.
