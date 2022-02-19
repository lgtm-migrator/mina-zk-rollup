import { assert } from 'console';
import {
  CircuitValue,
  Field,
  isReady,
  Poseidon,
  PrivateKey,
  prop,
  PublicKey,
  shutdown,
  UInt64,
} from 'snarkyjs';

import { KeyedDataStore } from '../../src/lib/data_store/KeyedDataStore';

// demo purposes
class Account extends CircuitValue {
  @prop balance: UInt64;
  @prop publicKey: PublicKey;

  constructor(balance: UInt64, publicKey: PublicKey) {
    super();
    this.balance = balance;
    this.publicKey = publicKey;
  }
}

describe('KeyedDataStore primitive string key', () => {
  let store: KeyedDataStore<string, Account>;
  let dataLeaves: Map<string, Account>;

  let accountA: Account,
    accountB: Account,
    accountC: Account,
    accountD: Account;

  beforeAll(async () => {
    await isReady;
  });

  afterAll(async () => {
    shutdown();
  });

  beforeEach(() => {
    store = new KeyedDataStore<string, Account>();
    dataLeaves = new Map<string, Account>();

    let p1 = PrivateKey.random().toPublicKey();
    accountA = new Account(UInt64.fromNumber(100), p1);
    dataLeaves.set('A', accountA);

    let p2 = PrivateKey.random().toPublicKey();
    accountB = new Account(UInt64.fromNumber(100), p2);
    dataLeaves.set('B', accountB);

    let p3 = PrivateKey.random().toPublicKey();
    accountC = new Account(UInt64.fromNumber(100), p3);
    dataLeaves.set('C', accountC);

    let p4 = PrivateKey.random().toPublicKey();
    accountD = new Account(UInt64.fromNumber(330), p4);
  });

  it('should create datastore from map of leaves', () => {
    expect(store.dataStore.size).toEqual(0);
    let ok = store.fromData(dataLeaves);
    expect(ok);
    expect(store.dataStore.size).toEqual(3);
  });

  it('should create datastore from map of leaves', () => {
    expect(store.dataStore.size).toEqual(0);
    let ok = store.fromData(dataLeaves);
    expect(ok);
    expect(store.dataStore.size).toEqual(3);
  });

  it('should generate correct Merkle Root from store generated by data leaves map', () => {
    let ok = store.fromData(dataLeaves);
    assert(ok);

    let root = store.getMerkleRoot();
    expect(root).toBeDefined();

    let h_a = Poseidon.hash(accountA.toFields());
    let h_b = Poseidon.hash(accountB.toFields());
    let h_c = Poseidon.hash(accountC.toFields());

    let h_ab = Poseidon.hash([h_a, h_b]);

    let expectedRoot = Poseidon.hash([h_ab, h_c]);

    // need this weird workaround otherwise typescript thinks root can still be undefined een after the asssert
    if (root !== undefined) {
      assert(expectedRoot.equals(root).toBoolean());
    } else {
      throw new Error('Root does not match expected root');
    }
  });

  it('should add new elements via .set correctly', () => {
    expect(store.dataStore.size).toEqual(0);
    store.set('foo', accountA);
    expect(store.dataStore.size).toEqual(1);
    expect(store.getMerkleRoot()).toEqual(Poseidon.hash(accountA.toFields()));
  });

  it('should get elements via .get correctly that are set by data leaves', () => {
    expect(store.dataStore.size).toEqual(0);
    let ok = store.fromData(dataLeaves);
    assert(ok);
    expect(store.dataStore.size).toEqual(3);
    let a = store.get('A');
    let b = store.get('B');
    let c = store.get('C');

    // very weird workaround..
    if (a !== undefined && b !== undefined && c !== undefined) {
      assert(a.equals(accountA)!.toBoolean());
      assert(b.equals(accountB)!.toBoolean());
      assert(c.equals(accountC)!.toBoolean());
    } else {
      throw new Error('Object(s) are undefined.');
    }
  });
});

describe('KeyedDataStore snarkyjs PublicKey key', () => {
  let store: KeyedDataStore<PublicKey, Account>;
  let dataLeaves: Map<PublicKey, Account>;

  let accountA: Account,
    accountB: Account,
    accountC: Account,
    accountD: Account;

  let p1: PublicKey, p2: PublicKey, p3: PublicKey, p4: PublicKey;

  beforeAll(async () => {
    await isReady;
  });

  afterAll(async () => {
    shutdown();
  });

  beforeEach(() => {
    store = new KeyedDataStore<PublicKey, Account>();
    dataLeaves = new Map<PublicKey, Account>();

    p1 = PrivateKey.random().toPublicKey();
    accountA = new Account(UInt64.fromNumber(100), p1);
    dataLeaves.set(p1, accountA);

    p2 = PrivateKey.random().toPublicKey();
    accountB = new Account(UInt64.fromNumber(100), p2);
    dataLeaves.set(p2, accountB);

    p3 = PrivateKey.random().toPublicKey();
    accountC = new Account(UInt64.fromNumber(100), p3);
    dataLeaves.set(p3, accountC);

    p4 = PrivateKey.random().toPublicKey();
    accountD = new Account(UInt64.fromNumber(330), p4);
  });

  it('should create datastore from map of leaves', () => {
    expect(store.dataStore.size).toEqual(0);
    let ok = store.fromData(dataLeaves);
    expect(ok);
    expect(store.dataStore.size).toEqual(3);
  });

  it('should create datastore from map of leaves', () => {
    expect(store.dataStore.size).toEqual(0);
    let ok = store.fromData(dataLeaves);
    expect(ok);
    expect(store.dataStore.size).toEqual(3);
  });

  it('should generate correct Merkle Root from store generated by data leaves map', () => {
    let ok = store.fromData(dataLeaves);
    assert(ok);

    let root = store.getMerkleRoot();
    expect(root).toBeDefined();

    let h_a = Poseidon.hash(accountA.toFields());
    let h_b = Poseidon.hash(accountB.toFields());
    let h_c = Poseidon.hash(accountC.toFields());

    let h_ab = Poseidon.hash([h_a, h_b]);

    let expectedRoot = Poseidon.hash([h_ab, h_c]);

    // need this weird workaround otherwise typescript thinks root can still be undefined een after the asssert
    if (root !== undefined) {
      assert(expectedRoot.equals(root).toBoolean());
    } else {
      throw new Error('Root does not match expected root');
    }
  });

  it('should add new elements via .set correctly', () => {
    expect(store.dataStore.size).toEqual(0);
    store.set(p1, accountA);
    expect(store.dataStore.size).toEqual(1);
    expect(store.getMerkleRoot()).toEqual(Poseidon.hash(accountA.toFields()));
  });

  it('should get elements via .get correctly that are set by data leaves', () => {
    expect(store.dataStore.size).toEqual(0);
    let ok = store.fromData(dataLeaves);
    assert(ok);
    expect(store.dataStore.size).toEqual(3);
    let a = store.get(p1);
    let b = store.get(p2);
    let c = store.get(p3);

    // very weird workaround..
    if (a !== undefined && b !== undefined && c !== undefined) {
      assert(a.equals(accountA)!.toBoolean());
      assert(b.equals(accountB)!.toBoolean());
      assert(c.equals(accountC)!.toBoolean());
    } else {
      throw new Error('Object(s) are undefined.');
    }
  });
});
