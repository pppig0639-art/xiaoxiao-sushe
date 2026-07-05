// 輪值提醒。個人模式(mode==="personal")不顯示指派對象，永遠指派給自己；
// 家庭/宿舍模式(mode==="shared")可以手動選人，或按「自動分配」交給系統挑目前做最少的人。

import * as store from "../store.js";
import { markDone, createDuty, pickFairestAssignee } from "../db/duties.js";

let listEl = null;
let assigneeFieldEl = null;
let assigneeSelectEl = null;
let autoAssignBtnEl = null;
let taskInputEl = null;
let formEl = null;
let dormId = null;
let mode = "shared";
let pendingAutoAssign = false;

export function initDutiesView(_dormId, _mode) {
  dormId = _dormId;
  mode = _mode || "shared";
  listEl = document.getElementById("duty-list");
  formEl = document.getElementById("duty-form");
  taskInputEl = document.getElementById("duty-task-input");
  assigneeFieldEl = document.getElementById("assignee-field");
  assigneeSelectEl = document.getElementById("duty-assignee-select");
  autoAssignBtnEl = document.getElementById("auto-assign-btn");

  if (mode === "personal") {
    assigneeFieldEl.hidden = true;
    autoAssignBtnEl.hidden = true;
  } else {
    autoAssignBtnEl.hidden = false;
    autoAssignBtnEl.addEventListener("click", () => {
      pendingAutoAssign = true;
      formEl.requestSubmit();
    });
  }

  formEl.addEventListener("submit", handleCreateDuty);

  store.subscribe("duties", renderDuties);
  store.subscribe("members", renderAssigneeOptions);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function renderAssigneeOptions(members) {
  const previousValue = assigneeSelectEl.value;
  assigneeSelectEl.innerHTML = "";
  members.forEach((member) => {
    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = member.displayName;
    assigneeSelectEl.appendChild(option);
  });
  if (previousValue) assigneeSelectEl.value = previousValue;
}

function currentUserId() {
  const members = store.get("members") || [];
  // 個人模式下寢室永遠只有一個成員
  return members[0] ? members[0].id : null;
}

function handleCreateDuty(e) {
  e.preventDefault();
  const taskName = taskInputEl.value.trim();
  if (!taskName) return;

  let assignedUid;
  if (mode === "personal") {
    assignedUid = currentUserId();
  } else if (pendingAutoAssign) {
    const members = store.get("members") || [];
    const picked = pickFairestAssignee(members);
    assignedUid = picked ? picked.id : assigneeSelectEl.value;
  } else {
    assignedUid = assigneeSelectEl.value;
  }
  pendingAutoAssign = false;
  if (!assignedUid) return;

  createDuty(dormId, {
    cycleType: "daily",
    taskName,
    assignedUid,
    date: todayKey(),
  });
  taskInputEl.value = "";
}

function assigneeName(uid) {
  const members = store.get("members") || [];
  const member = members.find((m) => m.id === uid);
  return member ? member.displayName : "?";
}

function renderDuties(duties) {
  listEl.innerHTML = "";
  const today = todayKey();

  const todaysDuties = duties.filter((d) => d.date === today);

  if (todaysDuties.length === 0) {
    listEl.innerHTML = '<p class="duty-card">今天沒有排定任務</p>';
    return;
  }

  todaysDuties.forEach((duty) => {
    const card = document.createElement("div");
    card.className = "duty-card";

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!duty.isCompleted;
    checkbox.addEventListener("change", () => markDone(dormId, duty.id, duty.assignedUid, checkbox.checked));

    label.appendChild(checkbox);
    const suffix = mode === "personal" ? "" : `（${assigneeName(duty.assignedUid)}）`;
    label.append(` ${duty.taskName}${suffix}`);
    card.appendChild(label);
    listEl.appendChild(card);
  });
}
