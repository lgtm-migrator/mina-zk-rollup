import Service from './Service';
import * as MinaSDK from '@o1labs/client-sdk';
import ISignature from '../../lib/models/interfaces/ISignature';
import ITransaction from '../../lib/models/interfaces/ITransaction';
import EnumError from '../../lib/models/interfaces/EnumError';
import TransactionPool from '../setup/TransactionPool';
import { sha256 } from '../../lib/sha256';
import EventHandler from '../setup/EvenHandler';
import Events from '../../lib/models/interfaces/Events';
import { Field, PublicKey, Signature } from 'snarkyjs';
import signatureFromInterface from '../../lib/helpers/signatureFromInterface';
import publicKeyFromInterface from '../../lib/helpers/publicKeyFromInterface';
import IPublicKey from '../../lib/models/interfaces/IPublicKey';

class RequestService extends Service {
  constructor() {
    super();
  }

  static produceRollupBlock() {
    console.log(
      `producing a new rollup block with ${
        TransactionPool.getInstance().length
      } transctions`
    );

    let transactionsToProcess: Array<ITransaction> = new Array<ITransaction>();
    Object.assign(transactionsToProcess, TransactionPool.getInstance());
    TransactionPool.getInstance().length = 0;
    console.log(transactionsToProcess);
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
    // ! TODO make sure the sig pub key is the same as the from public key!

    let pubKey: PublicKey = publicKeyFromInterface(transaction.publicKey);
    let message: Field[] = transaction.payload.map((f) => Field(f));

    if (signature === undefined) {
      return EnumError.InvalidSignature;
    }
    if (!signature.verify(pubKey, message).toBoolean()) {
      return EnumError.InvalidSignature;
    }

    // transaction.hash = sha256(JSON.stringify(transaction.signature));

    let poolSize = TransactionPool.getInstance().push(transaction);

    // TODO: use config for block size
    // NOTE: define a more precise way to produce blocks; either by filling up a block or producing a block every x hours/minutes
    // maybe even introduce a global state the operator has access to, including a variable LAST_PRODUCED_ROLLUP_TIME
    // if LAST_PRODUCED_ROLLUP_TIME <= CURRENT_TIME exceeds eg 1hr, produce a block
    // if poolSize >= TARGET_ROLLUP_BLOCK_SIZE produce a block
    if (poolSize >= 5) {
      EventHandler.getInstance().emit(Events.PENDING_TRANSACTION_POOL_FULL);
    }

    // return transaction.hash!;
    return true;
  }
}

export default RequestService;
