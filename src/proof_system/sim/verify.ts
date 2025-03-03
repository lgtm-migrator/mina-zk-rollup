import RollupAccount from '../models/RollupAccount';
import RollupTransaction from '../models/RollupTransaction';

export const verifyTransaction = (
  tx: RollupTransaction,
  sender: RollupAccount,
  receiver: RollupAccount
) => {
  try {
    sender.publicKey.assertEquals(tx.from);

    receiver.publicKey.assertEquals(tx.to);

    let isValidSig = tx.signature.verify(tx.from, tx.toFields());
    console.log('is valid sig', isValidSig.toString());
    isValidSig.assertTrue();
    /*     tx.amount.assertLte(sender.balance);
    tx.nonce.assertEquals(sender.nonce); */
  } catch (error) {
    throw new Error('Cannot verify transaction, transaction invalid.');
  }
};
