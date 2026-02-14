import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserLoginResponse } from "../../screens/user/models/UserLoginResponse";

const KEY = "SAVED_ACCOUNTS";

export type SavedAccount = {
  id: string;
  username: string;
  password: string;
  user: UserLoginResponse;
};

const getAll = async (): Promise<SavedAccount[]> => {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
};

const save = async (account: SavedAccount) => {
  const list = await getAll();
  const filtered = list.filter((a) => a.id !== account.id);
  await AsyncStorage.setItem(KEY, JSON.stringify([account, ...filtered]));
};

const remove = async (id: string) => {
  const list = await getAll();
  const filtered = list.filter((a) => a.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
};

const clear = async () => {
  await AsyncStorage.removeItem(KEY);
};

export default { getAll, save, remove, clear };