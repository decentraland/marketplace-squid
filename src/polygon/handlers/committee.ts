import { createOrLoadAccount } from "../../common/modules/account";
import { Account, Network } from "../../model";
import { MemberSetEventArgs } from "../abi/Committee";

export function handleMemeberSet(
  accounts: Map<string, Account>,
  event: MemberSetEventArgs
): void {
  const account = createOrLoadAccount(accounts, event._member, Network.polygon);

  account.isCommitteeMember = event._value;
}
