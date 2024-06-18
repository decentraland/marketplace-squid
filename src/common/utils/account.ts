import { Account } from "../../model";

export function createAccount(id: string): Account {
  return new Account({
    id,
    address: id,
    sales: 0,
    purchases: 0,
    earned: BigInt(0),
    spent: BigInt(0),
  });
}

export function createOrLoadAccount(
  accounts: Map<string, Account>,
  id: string
): Account {
  let account = accounts.get(id);

  if (!account) {
    account = createAccount(id);
  }

  accounts.set(id, account);
  return account;
}
