// 極簡全域狀態 + pub/sub。
// db/*.js 的 onSnapshot 監聽到 Firestore 變化時呼叫 store.set(key, data)，
// views/*.js 呼叫 store.subscribe(key, callback) 訂閱、拿最新資料重新渲染。

const state = {
  members: [],
  rooms: [],
  duties: [],
  messages: [],
  pet: null,
  incomingKnocks: [],
  actions: [],
};

const listeners = {
  members: new Set(),
  rooms: new Set(),
  duties: new Set(),
  messages: new Set(),
  pet: new Set(),
  incomingKnocks: new Set(),
  actions: new Set(),
};

export function set(key, value) {
  state[key] = value;
  listeners[key].forEach((cb) => cb(value));
}

export function get(key) {
  return state[key];
}

export function subscribe(key, callback) {
  listeners[key].add(callback);
  if (state[key] !== null && state[key] !== undefined && !(Array.isArray(state[key]) && state[key].length === 0)) {
    callback(state[key]);
  }
  return () => listeners[key].delete(callback);
}
