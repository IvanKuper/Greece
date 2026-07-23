// @ts-nocheck - not yet type-annotated. Revisit in a future milestone.
const fs = require("fs");
const path = require("path");
const webpush = require("web-push");
const { db, id, now } = require("./db");

const keysPath = path.join(__dirname, "..", "storage", ".vapid-keys.json");

function loadOrCreateVapidKeys() {
  if (fs.existsSync(keysPath)) {
    return JSON.parse(fs.readFileSync(keysPath, "utf-8"));
  }
  const keys = webpush.generateVAPIDKeys();
  fs.mkdirSync(path.dirname(keysPath), { recursive: true });
  fs.writeFileSync(keysPath, JSON.stringify(keys), "utf-8");
  return keys;
}

const vapidKeys = loadOrCreateVapidKeys();
webpush.setVapidDetails(
  "mailto:" + (process.env.CONTACT_EMAIL || "greece.maintenance.servicese.ltd@gmail.com"),
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

function subscribe(userId, subscription) {
  const existing = db
    .prepare("SELECT id FROM push_subscriptions WHERE endpoint=?")
    .get(subscription.endpoint);
  if (existing) {
    db.prepare(
      "UPDATE push_subscriptions SET user_id=?,p256dh=?,auth=? WHERE id=?",
    ).run(
      userId,
      subscription.keys.p256dh,
      subscription.keys.auth,
      existing.id,
    );
    return;
  }
  db.prepare(
    "INSERT INTO push_subscriptions(id,user_id,endpoint,p256dh,auth,created_at) VALUES(?,?,?,?,?,?)",
  ).run(
    id(),
    userId,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    now(),
  );
}

function unsubscribe(endpoint) {
  db.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").run(endpoint);
}

async function sendToUsers(userIds, payload) {
  if (!userIds.length) return;
  const placeholders = userIds.map(() => "?").join(",");
  const subs = db
    .prepare(
      `SELECT * FROM push_subscriptions WHERE user_id IN (${placeholders})`,
    )
    .all(...userIds);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          db.prepare("DELETE FROM push_subscriptions WHERE id=?").run(sub.id);
        }
      }
    }),
  );
}

async function sendToAdmins(payload) {
  const admins = db
    .prepare(
      "SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name IN ('administrator','super_admin')",
    )
    .all();
  await sendToUsers(
    admins.map((a) => a.id),
    payload,
  );
}

module.exports = {
  publicKey: vapidKeys.publicKey,
  subscribe,
  unsubscribe,
  sendToUsers,
  sendToAdmins,
};
