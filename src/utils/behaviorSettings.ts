/* Utilities to persist gamification behavior UI-only settings without touching BE */

const ACTIVATION_KEY = 'gamification_behavior_activation';
const GROUP_ORDER_KEY = 'gamification_behavior_group_order';
const BEHAVIOR_CODE_MAP_KEY = 'gamification_behavior_code_map';

type ActivationStore = Record<string, boolean>;
type GroupOrderStore = Record<string, number>;
type BehaviorCodeMap = Record<string, number>;

const readFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeToStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write failures (private / storage full)
  }
};

export const getBehaviorActivation = (behaviorId: number, defaultValue = true): boolean => {
  const store = readFromStorage<ActivationStore>(ACTIVATION_KEY, {});
  const value = store[String(behaviorId)];
  return typeof value === 'boolean' ? value : defaultValue;
};

export const setBehaviorActivation = (behaviorId: number, isActive: boolean) => {
  const store = readFromStorage<ActivationStore>(ACTIVATION_KEY, {});
  store[String(behaviorId)] = isActive;
  writeToStorage(ACTIVATION_KEY, store);
};

export const removeBehaviorActivation = (behaviorId: number) => {
  const store = readFromStorage<ActivationStore>(ACTIVATION_KEY, {});
  if (store[String(behaviorId)] === undefined) return;
  delete store[String(behaviorId)];
  writeToStorage(ACTIVATION_KEY, store);
};

export const getBehaviorIdByCode = (code: string): number | undefined => {
  const map = readFromStorage<BehaviorCodeMap>(BEHAVIOR_CODE_MAP_KEY, {});
  const value = map[code];
  return typeof value === 'number' ? value : undefined;
};

export const setBehaviorCodeMapping = (code: string, behaviorId: number) => {
  const map = readFromStorage<BehaviorCodeMap>(BEHAVIOR_CODE_MAP_KEY, {});
  map[code] = behaviorId;
  writeToStorage(BEHAVIOR_CODE_MAP_KEY, map);
};

export const loadGroupOrder = (): GroupOrderStore => {
  return readFromStorage<GroupOrderStore>(GROUP_ORDER_KEY, {});
};

export const saveGroupOrder = (order: GroupOrderStore) => {
  writeToStorage(GROUP_ORDER_KEY, order);
};

export const ensureGroupOrder = <T extends { id: number }>(groups: T[]): GroupOrderStore => {
  const order = loadGroupOrder();
  let maxOrder = Math.max(0, ...Object.values(order));

  groups.forEach((group) => {
    if (order[String(group.id)] === undefined) {
      maxOrder += 1;
      order[String(group.id)] = maxOrder;
    }
  });

  saveGroupOrder(order);
  return order;
};

export const removeGroupFromOrder = (groupId: number) => {
  const order = loadGroupOrder();
  if (order[String(groupId)] !== undefined) {
    delete order[String(groupId)];
    saveGroupOrder(order);
  }
};

export const insertGroupWithOrder = (
  groupId: number,
  desiredOrder: number,
) => {
  const order = loadGroupOrder();
  const normalizedOrder = desiredOrder < 1 ? 1 : desiredOrder;

  Object.entries(order).forEach(([id, currentOrder]) => {
    if (currentOrder >= normalizedOrder) {
      order[id] = currentOrder + 1;
    }
  });

  order[String(groupId)] = normalizedOrder;
  saveGroupOrder(order);
  return order;
};

export const sortGroupsByStoredOrder = <T extends { id: number; name: string }>(
  groups: T[],
) => {
  const order = ensureGroupOrder(groups);
  return [...groups]
    .map((group) => ({
      ...group,
      displayOrder: order[String(group.id)],
    }))
    .sort((a, b) => {
      const orderDiff = (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });
};


