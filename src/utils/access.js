const config = require("../config/config");

const DAY_MS = 24 * 60 * 60 * 1000;
const TEASER_LENGTH = 200;

const LOCKED_STORY_MESSAGE = "This story is only for subscribers.";

// Admins create every account, and the free trial starts when the account is created.
const trialEndsAt = (user) =>
  new Date(new Date(user.created_at).getTime() + config.trialDays * DAY_MS);

// Accounts created after this moment are still in their trial.
const trialCutoff = () => new Date(Date.now() - config.trialDays * DAY_MS);

// Payment happens outside the platform; an admin records it by marking the user as paid.
const isPaid = (user) => user?.payment_status === "SUBSCRIBED";

// Paid users, and users still in their trial, can read paid stories and save AI stories.
const hasFullAccess = (user) =>
  Boolean(user) && (isPaid(user) || Date.now() < trialEndsAt(user).getTime());

const accessSummary = (user) => {
  const full = hasFullAccess(user);
  return {
    plan: isPaid(user) ? "paid" : full ? "trial" : "free",
    trial_ends_at: trialEndsAt(user),
    can_read_paid_stories: full,
    can_save_stories: full,
  };
};

// Every story needs a signed-in user; free ones are open to every plan.
const canReadStory = (story, user) => story.type !== "PAID" || hasFullAccess(user);

// Plain text from the story's HTML, cut short. Entities stay encoded, so it is still safe to render as HTML.
const toTeaser = (html) => {
  const text = String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= TEASER_LENGTH) return text;
  let cut = text.slice(0, TEASER_LENGTH);
  if (cut.lastIndexOf("&") > cut.lastIndexOf(";")) cut = cut.slice(0, cut.lastIndexOf("&"));
  return `${cut.trimEnd()}…`;
};

// A story the reader can't open keeps its title, images and categories, but its text becomes a teaser.
const presentStory = (story, user) => {
  const data = typeof story.toJSON === "function" ? story.toJSON() : { ...story };
  if (canReadStory(data, user)) return { ...data, is_locked: false };
  return { ...data, description: toTeaser(data.description), is_locked: true };
};

module.exports = {
  LOCKED_STORY_MESSAGE,
  trialEndsAt,
  trialCutoff,
  isPaid,
  hasFullAccess,
  accessSummary,
  canReadStory,
  presentStory,
};
