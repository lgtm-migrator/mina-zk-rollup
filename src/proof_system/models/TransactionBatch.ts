import { arrayProp, CircuitValue } from 'snarkyjs';
import RollupTransaction from './RollupTransaction.js';
import Config from '../../config/config.js';
const BATCH_SIZE = Config.batchSize;

export default class TransactionBatch extends CircuitValue {
  @arrayProp(RollupTransaction, BATCH_SIZE)
  xs!: RollupTransaction[];

  static batchSize = BATCH_SIZE;

  constructor(xs: RollupTransaction[]) {
    super(xs);
  }

  static fromElements(xs: RollupTransaction[]): TransactionBatch {
    if (xs.length !== BATCH_SIZE) {
      throw Error(
        `Can only process exactly ${BATCH_SIZE} transactions in one batch.`
      );
    }
    return new TransactionBatch(xs);
  }
}
