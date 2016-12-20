// A "contract" is an immutable piece of code.

// TODO: edit .flowconfig to unignore this file

// Two most useful FlowType docs:
// https://flowtype.org/docs/quick-reference.html
// https://flowtype.org/docs/objects.html
// https://flowtype.org/docs/functions.html

// Useful reading on ES6 classes:
// http://www.benmvp.com/learning-es6-classes/
// https://www.sitepoint.com/object-oriented-javascript-deep-dive-es6-classes/

export class Backend {
  /* these functions all return promises */
  // data retrieval
  retrieveGroup (id) {} // resolves to a Group object
  retrieveIdentity (id) {} // resolves to an Identity object (IPNS?)
  // data setup
  createGroup (group) {}
  createIdentity (identity) {}
}

// must be compatible with tor
export class MessageRelay {
  sendEphemeralMsg (groupOrIdentity, msg) {}
  sendLogMsg (group, msg) {}
}

// =======================
// Utility classes
// =======================

// TODO: are classes really the right way to go? what about POJOs + FlowType?

export class Key {
  static TYPE_AES = 0
  constructor (type, data) {
    this._type = type
    this._data = data
  }
  get type () { this._type }
  get data () { this._data }
}

export class KeyPair {
  constructor (pub, priv) {
    this._pub = pub
    this._priv = priv
  }
}

export class Crypto {
  genKeypair (type) {}
  encryptData (data, key) {}
}

export class Keychain {
  genKeys () {}
  signMessage () {}
  verifyMessage () {}
}

// =======================
// Identity related contracts for proving you are you.
//
// - Your `masterIdentity` is used to represent *you*.
// - Your `masterIdentity` can outsource capabilities
//   to surrogates who can perform certain tasks based
//   on the permissions you give them. This can include
//   anything from signing messages on your behalf to
//   transfering funds to replacing or revoking your
//   `masterIdentity` key.
// =======================

export class IdentityContract {
  /*
  masterIdentity: KeyHash
  surrogates: Array<SurrogateContract>
  */
}

export class SurrogateContract {
  /*
  surrogateFor: IdentityContract
  permissions:  AddSurrogate
                | RemoveSurrogate
                | RevokeIdentity
                | ReplaceIdentity
                | TransferFunds
                | SignStatements
  keys: Array<KeyHash>

  // num `keys` to authorize surrogate for `permissions`
  nOfM: number
  */
}

export class UserContract {
  /*
    identity: IdentityContract
    givingLimit: number
    receivingLimit: number
    income: number | Array<number>
  */
}

// =======================
// Identity related classes that manage your
// identity in a more traditional manner.
// =======================

export class Identity {
  /*
  contract: IdentityContract

  // statements about me from me
  bio: {
      [key: string]: any

      e.g.:
      name: string,
      email: string,
      picture: Img | URL ...
    }

  // statements about me from others
  attestations: Array<any>
  */
}

export class User {
  /*
  identity: Identity

  // backend needs to know some of this too
  // in order to properly enforce the fairness check. especially
  // the contribution limit and income
  User: {
    id: {type: 'string', primaryKey: true, required: true},
    name: {type: 'string', unique: true, required: true},
    password: {type: 'string', required: true},
    contriGL: {type: 'integer', required: true},
    contriRL: {type: 'integer', required: true},
    // optional
    email: {type: 'string'},
    phone: {type: 'string'},
    payPaypal: {type: 'string'},
    payBitcoin: {type: 'string'},
    payVenmo: {type: 'string'},
    payInstructions: {type: 'string'},
    // reference to Group
    groups: {collection: 'group', via: 'users'}
  },
  Income: {
    id: {type: 'string', primaryKey: true, defaultsTo: uuid.v4},
    month: {type: 'string', required: true},
    amount: {type: 'integer', required: true},
    // foreign key, https://github.com/balderdashy/waterline-docs/blob/master/models/associations/one-to-one.md
    user: {model: 'user'}
  }, */
}

// =======================
// Group related classes
// =======================

export class GroupContract {
  /*
  // the key to encrypt invite acceptance messages to
  // to send messages between group members off-chain,
  // it's probably better to use one of the mpOTR mechanisms
  messageKey: IdentityContract

  // the set of rules the group abides by
  constitution: {
    nOfM: number   // to replace the constitution
    rules: Array<{
      name: string  (e.g. "mincome", "newMemberThreshold", etc.)
      value: any
      nOfM: number // to replace a rule
    }>
  }

  // it would be preferable that these not be publicly known,
  // but, since Ethereum doesn't have support for schnorr threshold
  // signature anonymizing magic (yet), these will have to be public.
  // otherwise this array wouldn't be here. You would find out the
  // member keys by gossiping with the memebers instead.
  members: Array<IdentityContract>
  */
  // The individual that sends messages to actually update
  // the constitution or its rules is probably selected
  // by assigning a random shuffling of numbers to the
  // group members. Algorithm:
  //
  // if (ImNumberOne()) {
  //   broadcastIntentToUpdate()
  //   updateConstitution()
  // } else {
  //   askPersonWithNumberBelowMeIfThey'veTriedUpdatingConstitution()
  //   if (theyDontReplyAfterTimeout()) {
  //     if (constitutionNotUpdated) {
  //       broadcastIntentToUpdate()
  //       updateConstitution()
  //     }
  //   }
  // }
}

export class Group {
  /*
    contract: GroupContract
    members: Array<Identity>
  */
}
