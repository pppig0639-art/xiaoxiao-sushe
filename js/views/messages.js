// 留言板/即時聊天。公共頻道大家都看得到，選一個人就變成只有你們兩個看得到的悄悄話。
// Firestore 的 onSnapshot 本來就是即時的，所以這裡不用另外做輪詢。

import * as store from "../store.js";
import { postMessage, dmChannelId } from "../db/messages.js";

let listEl = null;
let formEl = null;
let inputEl = null;
let channelSelectEl = null;
let currentUid = null;
let dormId = null;
let latestMessages = [];
// channel id -> [uidA, uidB]，送出悄悄話時要帶著送，firestore.rules 才擋得住別人偷看
const channelParticipants = {};

export function initMessagesView(_dormId, uid) {
  dormId = _dormId;
  currentUid = uid;
  listEl = document.getElementById("message-list");
  formEl = document.getElementById("message-form");
  inputEl = document.getElementById("message-input");
  channelSelectEl = document.getElementById("message-channel-select");

  formEl.addEventListener("submit", handleSubmit);
  channelSelectEl.addEventListener("change", renderMessages);
  store.subscribe("members", renderChannelOptions);
  store.subscribe("messages", (messages) => {
    latestMessages = messages;
    renderMessages();
  });
}

function selectedChannel() {
  return channelSelectEl.value || "public";
}

function renderChannelOptions() {
  const members = (store.get("members") || []).filter((m) => m.id !== currentUid);
  const prevValue = channelSelectEl.value;
  channelSelectEl.innerHTML = "";

  const publicOption = document.createElement("option");
  publicOption.value = "public";
  publicOption.textContent = "公共頻道";
  channelSelectEl.appendChild(publicOption);

  members.forEach((member) => {
    const channelId = dmChannelId(currentUid, member.id);
    channelParticipants[channelId] = [currentUid, member.id];
    const option = document.createElement("option");
    option.value = channelId;
    option.textContent = `悄悄話：${member.displayName}`;
    channelSelectEl.appendChild(option);
  });

  if (prevValue && [...channelSelectEl.options].some((o) => o.value === prevValue)) {
    channelSelectEl.value = prevValue;
  }
  renderMessages();
}

function handleSubmit(e) {
  e.preventDefault();
  const content = inputEl.value.trim();
  if (!content) return;
  const channel = selectedChannel();
  const participants = channel === "public" ? null : channelParticipants[channel] || null;
  postMessage(dormId, content, currentUid, channel, participants);
  inputEl.value = "";
}

function authorName(authorUid) {
  const members = store.get("members") || [];
  const author = members.find((m) => m.id === authorUid);
  if (!author) return "室友";
  return author.role === "visitor" ? `${author.displayName}（訪客）` : author.displayName;
}

function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  return timestamp.toDate().toLocaleString("zh-TW", { hour: "2-digit", minute: "2-digit", month: "numeric", day: "numeric" });
}

function renderMessages() {
  const channel = selectedChannel();
  listEl.innerHTML = "";
  latestMessages
    .filter((msg) => (msg.channel || "public") === channel)
    .forEach((msg) => {
      const item = document.createElement("div");
      item.className = "message-item";

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${authorName(msg.authorUid)} · ${formatTime(msg.createdAt)}`;

      const content = document.createElement("div");
      content.className = "content";
      content.textContent = msg.content;

      item.append(meta, content);
      listEl.appendChild(item);
    });
}
