import Service from './Service';
import ISignature from '../../lib/models/interfaces/ISignature';
import ITransaction from '../../lib/models/interfaces/ITransaction';
import EnumError from '../../lib/models/interfaces/EnumError';
import DataStore from '../setup/DataStore';
import { sha256 } from '../../lib/sha256';
import EventHandler from '../setup/EvenHandler';
import Events from '../../lib/models/interfaces/Events';
import { Circuit, Field, PublicKey, Signature, UInt32, UInt64 } from 'snarkyjs';
import signatureFromInterface from '../../lib/helpers/signatureFromInterface';
import publicKeyFromInterface from '../../lib/helpers/publicKeyFromInterface';
import IPublicKey from '../../lib/models/interfaces/IPublicKey';
import RollupProof from '../../lib/models/rollup/RollupProof';
import RollupTransaction from '../../lib/models/rollup/RollupTransaction';
import { DataStack } from '../../lib/data_store/DataStack';
import RollupDeposit from '../../lib/models/rollup/RollupDeposit';
import { KeyedDataStore } from '../../lib/data_store/KeyedDataStore';
import RollupAccount from '../../lib/models/rollup/RollupAccount';

class RequestService extends Service {
  constructor() {
    super();
  }

  static async produceRollupBlock() {
    console.log(
      `producing a new rollup block with ${
        DataStore.getTransactionPool().length
      } transctions`
    );

    let transactionsToProcess: Array<ITransaction> = new Array<ITransaction>();
    Object.assign(transactionsToProcess, DataStore.getTransactionPool());
    DataStore.getTransactionPool().length = 0;

    // TODO: do real calculations

    let pendingDeposits: DataStack<RollupDeposit> =
      new DataStack<RollupDeposit>();

    // let accountDb: KeyedDataStore<PublicKey, RollupAccount> =
    //   new KeyedDataStore<PublicKey, RollupAccount>();

    // accountDb.set(
    //   publicKeyFromInterface(transactionsToProcess[0].sender_publicKey),
    //   new RollupAccount(
    //     UInt64.fromNumber(100),
    //     publicKeyFromInterface(transactionsToProcess[0].sender_publicKey),
    //     UInt32.fromNumber(0)
    //   )
    // );
    // console.log(accountDb.getMerkleRoot()!.toString());
    // console.log(
    //   accountDb.get(
    //     publicKeyFromInterface(transactionsToProcess[0].sender_publicKey)
    //   )
    // );

    let proofBatch: RollupProof[] = [];
    transactionsToProcess.forEach(async (tx) => {
      let sender: PublicKey = publicKeyFromInterface(tx.sender_publicKey);
      let receiver: PublicKey = publicKeyFromInterface(tx.receiver_publicKey);
      let signature: Signature = signatureFromInterface(tx.signature);
      let rollupTx: RollupTransaction = new RollupTransaction(
        UInt64.fromNumber(parseInt(tx.payload[0])),
        UInt32.fromNumber(parseInt(tx.payload[1])),
        sender,
        receiver
      );

      try {
        let accountDb: KeyedDataStore<string, RollupAccount> =
          new KeyedDataStore<string, RollupAccount>();

        let pubSender: PublicKey = publicKeyFromInterface(
          transactionsToProcess[0].sender_publicKey
        );
        accountDb.set(
          pubSender.toJSON()!.toString(),
          new RollupAccount(
            UInt64.fromNumber(100),
            publicKeyFromInterface(transactionsToProcess[0].sender_publicKey),
            UInt32.fromNumber(0)
          )
        );
        let p: RollupProof = RollupProof.transaction(
          rollupTx,
          signature,
          pendingDeposits,
          accountDb
        );

        proofBatch.push(p);
      } catch (error) {
        console.log(error);
      }
    });

    console.log(proofBatch);
  }

  /**
   * Verifies a signature
   * @param signature Signature to verify
   * @returns true if signature is valid
   */
  verify(
    signature: ISignature,
    payload: string[],
    publicKey: IPublicKey
  ): boolean | EnumError {
    try {
      let fieldPayload: Field[] = payload.map((f: any) => Field(f));
      let pub = publicKeyFromInterface(publicKey);
      let sig = signatureFromInterface(signature);

      return sig.verify(pub, fieldPayload).toBoolean();
    } catch {
      return EnumError.BrokenSignature;
    }
  }

  processTransaction(transaction: ITransaction): boolean | EnumError {
    // verify signature so no faulty signature makes it into the pool

    let signature = signatureFromInterface(transaction.signature);
    console.log(signature.toJSON());

    let sender: PublicKey = publicKeyFromInterface(
      transaction.sender_publicKey
    );
    let message: Field[] = transaction.payload.map((f) => Field(f));

    if (signature === undefined) {
      return EnumError.InvalidSignature;
    }
    if (!signature.verify(sender, message).toBoolean()) {
      return EnumError.InvalidSignature;
    }

    transaction.hash = sha256(JSON.stringify(transaction.signature));

    let poolSize = DataStore.getTransactionPool().push(transaction);

    // TODO: use config for block size
    // NOTE: define a more precise way to produce blocks; either by filling up a block or producing a block every x hours/minutes
    // maybe even introduce a global state the operator has access to, including a variable LAST_PRODUCED_ROLLUP_TIME
    // if LAST_PRODUCED_ROLLUP_TIME <= CURRENT_TIME exceeds eg 1hr, produce a block
    // if poolSize >= TARGET_ROLLUP_BLOCK_SIZE produce a block
    if (poolSize >= 2) {
      EventHandler.emit(Events.PENDING_TRANSACTION_POOL_FULL);
    }

    // return transaction.hash!;
    return true;
  }
}

export default RequestService;
