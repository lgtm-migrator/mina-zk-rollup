/**
 * Integration test to test behavior of the prover
 */

import { Field, PrivateKey, PublicKey, UInt32, UInt64 } from 'snarkyjs';
import { signTx } from '../../client_sdk';
import { AccountStore as AccountStore_ } from '../../lib/data_store';
import { AccountMerkleProof } from '../../lib/merkle_proof';
import {
  RollupAccount,
  RollupState,
  RollupStateTransition,
  RollupTransaction,
  TransactionBatch,
} from '../../proof_system';
import { Prover } from '../../proof_system/prover';
import Config from '../../config/config';
import { applyTransitionSimulation } from '../../proof_system/sim/apply';

let dummyAccounts = [
  {
    publicKey: 'B62qpkPHkmoG73CdpDxHzNVkYse7vRH13jwNjcM3sgCVcJt5az64Aru',
    privateKey: 'EKEfcsQRnT4FDeu2jKWFQJB168GAqZyPiVhC5dvTgSsFsAozXPaG',
  },
  {
    publicKey: 'B62qmh1etPvw576SaENiQvD9sMURNfQ4B6fCXLHWzhuzSiAHkycr8NS',
    privateKey: 'EKF6PAAbpxkxYofq5JM4wpzRgCBGGZ5FJg6785ZyGFhwLBxCe5w5',
  },
  {
    publicKey: 'B62qm1P3vvQQq2Ro6xyNf8bBLyExHxiG3B45dTiNFcfimNnS1rTeicW',
    privateKey: 'EKFTGFrC4AKoaHfvFgoya4sYUfq3wu2zDwDqZBXrPVm6RpRffchb',
  },
  {
    publicKey: 'B62qqdakgumxVsGXfB5ouwHwthaWy8ZZPedjCRcRgk8aGp72R82zC2G',
    privateKey: 'EKDmSSoryde5ZEY9W9koA2BYL7PgDJLjZYuv6s9Mc2SkSZE1hmAu',
  },
];

const AccountStore = new AccountStore_();

dummyAccounts.forEach((acc, i) => {
  AccountStore.set(
    BigInt(i),
    new RollupAccount(
      UInt64.from(1000),
      UInt32.from(0),
      PublicKey.fromBase58(acc.publicKey),
      AccountMerkleProof.empty()
    )
  );
});

let committedState = new RollupState(Field.zero, AccountStore.getMerkleRoot());

console.log('got initial state: ', JSON.stringify(committedState));

console.log('compiling prover');
console.time('compile');
await Prover.compile();
console.timeEnd('compile');
console.log('prover compiled');

console.log('building and signing test transactions');
let txns = [];
for (let index = 0; index < Config.batchSize; index++) {
  txns.push(buildTx(dummyAccounts[0], dummyAccounts[1], 100, index));
}

console.log('simulating state transitions');
txns.forEach((tx) => applyTransitionSimulation(tx, AccountStore));

let currentState = new RollupState(Field.zero, AccountStore.getMerkleRoot());

let batch = TransactionBatch.fromElements(txns);

console.log('producing proof');
let stateTransition = new RollupStateTransition(committedState, currentState);
console.time('proof1');
let proof = await Prover.proveTransactionBatch(stateTransition, batch);
console.timeEnd('proof1');

console.log(
  `verifying valid state transitions of ${batch.xs.length} transactions`
);
proof.verify();
console.log('proof valid!');

console.log('producing invalid state transition');
stateTransition.source.accountDbCommitment = Field.zero;
try {
  console.time('proof2');
  let proof2 = await Prover.proveTransactionBatch(stateTransition, batch);
  console.timeEnd('proof2');
  proof2.verify();
  throw Error('invalid transition was expected to fail, but did not');
} catch {
  console.log('proof expected to be invalid!');
}

function buildTx(from: any, to: any, amount: number, nonce: number) {
  let tx = {
    from: from.publicKey,
    to: to.publicKey,
    amount: amount.toString(),
    nonce: nonce.toString(),
    tokenId: '0',
    signature: {
      r: '1',
      s: '1',
    },
  };

  return RollupTransaction.fromInterface(
    signTx(tx, PrivateKey.fromBase58(from.privateKey))
  );
}
