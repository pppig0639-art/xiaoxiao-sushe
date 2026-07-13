// 留言板。

import * as store from "../store.js";
import { postMessage } from "../db/messages.js";

let listEl = null;
let formEl = null;
let inputEl = null;
let currentUid = null;
let dormId = null;

export function initMessagesView(_dormId, uid) {
  dormId = _dormId;
  currentUid = uid;
  listEl = document.getElementById("message-list");
  formEl = document.getElementById("message-form");
  inputEl = document.getElementById("message-input");

  formEl.addEventListener("submit", handleSubmit);
  store.subscribe("messages", renderMessages);
}

function handleSubmit(e) {
  e.preventDefault();
  const content = inputEl.value.trim();
  if (!content) return;
  postMessage(dormId, content, currentUid);
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

function renderMessages(messages) {
  listEl.innerHTML = "";
  messages.forEach((msg) => {
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
