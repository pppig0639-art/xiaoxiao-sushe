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
let currentUid = null;
let mode = "shared";
let pendingAutoAssign = false;

export function initDutiesView(_dormId, uid, _mode) {
  dormId = _dormId;
  currentUid = uid;
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

// 訪客不用做家事，選單/自動分配都排除
function realMembers(members) {
  return members.filter((m) => m.role !== "visitor");
}

function renderAssigneeOptions(members) {
  const previousValue = assigneeSelectEl.value;
  assigneeSelectEl.innerHTML = "";
  realMembers(members).forEach((member) => {
    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = member.displayName;
    assigneeSelectEl.appendChild(option);
  });
  if (previousValue) assigneeSelectEl.value = previousValue;
}

function currentUserId() {
  const members = realMembers(store.get("members") || []);
  // 個人模式下寢室永遠只有一個正式成員(訪客不算)
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
    const picked = pickFairestAssignee(realMembers(store.get("members") || []));
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
    // 只有被指派的人自己能打勾完成，不然大家都亂點，任務算誰的就沒意義了
    const isMine = duty.assignedUid === currentUid;
    checkbox.disabled = !isMine;
    if (!isMine) checkbox.title = "只有被指派的人可以打勾完成";
    checkbox.addEventListener("change", () => {
      if (!isMine) return;
      markDone(dormId, duty.id, duty.assignedUid, checkbox.checked);
    });

    label.appendChild(checkbox);
    const suffix = mode === "personal" ? "" : `（${assigneeName(duty.assignedUid)}）`;
    label.append(` ${duty.taskName}${suffix}`);
    card.appendChild(label);
    listEl.appendChild(card);
  });
}
