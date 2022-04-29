import { CircuitValue, Field, prop, PublicKey, UInt64 } from 'snarkyjs';
import { ISerializableField, IDeserializableField } from '../../../lib/models';

/**
 * A {@link RollupDeposit} descibes the action when a user wants to deposit funds to the layer 2.
 */
export default class RollupDeposit
  extends CircuitValue
  implements ISerializableField, IDeserializableField<RollupDeposit>
{
  @prop publicKey: PublicKey;
  @prop amount: UInt64;
  @prop tokenId: UInt64;
  constructor(publicKey: PublicKey, amount: UInt64, tokenId: UInt64) {
    super();
    this.publicKey = publicKey;
    this.amount = amount;
    this.tokenId = tokenId;
  }
  serialize(): Field[] {
    throw new Error('Method not implemented.');
  }
  deserialize(xs: Field[]): RollupDeposit {
    throw new Error('Method not implemented.');
  }
}
