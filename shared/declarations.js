/* eslint no-undef: "off", no-unused-vars: "off" */
// =======================
// This file prevents flow from bitching about globals and "Required module not found"
// https://github.com/facebook/flow/issues/2092#issuecomment-232917073
//
// Note that the modules can (and should) be properly fixed with flow-typed
// https://github.com/okTurtles/group-income/issues/157
// =======================

// TODO: create a script in scripts/ to run flow via grunt-exec
//       and have it output (at the end of the run) helpful suggestions
//       like how to use `declare module` to ignore .vue requires,
//       and also a strong urging to not overdue the types because
//       FlowType is a little bit stupid and it can turn into a
//       banging-head-on-desk timesink (literally those words).
//       Have the script explain which files represent what.

// Our globals.
declare function fetchServerTime(fallback: ?boolean): Promise<string>
declare var logger: Object
// Nodejs globals.
declare var process: any
// Third-party globals
declare var Compartment: Function
declare var crypto: {
    getRandomValues: (buffer: Uint8Array) => Uint8Array,
    subtle: { [k: string]: Function }
}

// =======================
// Fix "Required module not found" in a hackish way.
// TODO: Proper fix is to use:
// https://github.com/okTurtles/group-income/issues/157
// =======================
declare module '@hapi/boom' { declare module.exports: any }
declare module '@hapi/hapi' { declare module.exports: any }
declare module '@hapi/inert' { declare module.exports: any }
declare module '@hapi/joi' { declare module.exports: any }
declare module 'hapi-pino' { declare module.exports: any }
declare module 'pino' { declare module.exports: any }
declare module 'buffer' { declare module.exports: { Buffer: typeof Buffer } }
declare module 'node:buffer' { declare module.exports: { Buffer: typeof Buffer } }
declare module 'chalk' { declare module.exports: any }
declare module 'dompurify' { declare module.exports: any }
declare module 'emoji-mart-vue-fast' { declare module.exports: any }
declare module 'emoji-mart-vue-fast/data/apple.json' { declare module.exports: any }
declare module 'form-data' { declare module.exports: any }
declare module 'node:fs/promises' { declare module.exports: any }
declare module 'node:path' { declare module.exports: any }
declare module 'node:worker_threads' { declare module.exports: any }
declare module 'node:net' { declare module.exports: any }
declare module 'scrypt-async' { declare module.exports: any }
declare module 'better-sqlite3' { declare module.exports: any }
declare module 'tweetnacl' { declare module.exports: any }
declare module 'vue' { declare module.exports: any }
declare module 'vue-clickaway' { declare module.exports: any }
declare module 'vue-router' { declare module.exports: any }
declare module 'vue-slider-component' { declare module.exports: any }
declare module 'vuelidate' { declare module.exports: any }
declare module 'vuelidate/lib/validators' { declare module.exports: any }
declare module 'vuelidate/lib/validators/maxLength' { declare module.exports: any }
declare module 'vuelidate/lib/validators/required' { declare module.exports: any }
declare module 'vuelidate/lib/validators/sameAs.js' { declare module.exports: any }
declare module 'vuex' { declare module.exports: any }
declare module 'idle-vue' { declare module.exports: any }
declare module 'vue2-touch-events' { declare module.exports: any }
declare module 'portal-vue' { declare module.exports: any }
declare module 'wicg-inert' { declare module.exports: any }
declare module 'ws' { declare module.exports: any }
declare module '@sbp/sbp' { declare module.exports: any }
declare module '@sbp/okturtles.data' { declare module.exports: any }
declare module '@sbp/okturtles.eventqueue' { declare module.exports: any }
declare module '@sbp/okturtles.events' { declare module.exports: any }
declare module 'favico.js' { declare module.exports: any }
declare module 'lru-cache' { declare module.exports: any }
declare module 'uuid' { declare module.exports: any }
declare module 'marked' { declare module.exports: any }
declare module 'bottleneck' { declare module.exports: any }
declare module '@apeleghq/rfc8188/decrypt' { declare module.exports: any }
declare module '@apeleghq/rfc8188/encodings' { declare module.exports: any }
declare module '@apeleghq/rfc8188/encrypt' { declare module.exports: any }

declare module '@chelonia/crypto' {
    declare type Key = {
        type: string;
        secretKey?: mixed;
        publicKey?: mixed;
    }
    declare module.exports: any
}
declare module '@chelonia/multiformats/bases/base58' { declare module.exports: any }
declare module '@chelonia/multiformats/blake2b' { declare module.exports: any }
declare module '@chelonia/multiformats/blake2bstream' { declare module.exports: any }
declare module '@chelonia/multiformats/bytes' { declare module.exports: any }
declare module '@chelonia/multiformats/cid' { declare module.exports: any }
declare module '@chelonia/serdes' { declare module.exports: any }
declare module 'turtledash' { declare module.exports: any }

// Only necessary because `AppStyles.vue` imports it from its script tag rather than its style tag.
declare module '@assets/style/main.scss' { declare module.exports: any }
// Other .js files.
declare module '@utils/blockies.js' { declare module.exports: Object }
declare module '~/frontend/model/contracts/misc/flowTyper.js' { declare module.exports: Object }
declare module '~/frontend/model/contracts/shared/time.js' { declare module.exports: Object }
declare module '@model/contracts/shared/time.js' { declare module.exports: Object }
declare module '@model/contracts/shared/constants.js' { declare module.exports: any }
declare module '@model/contracts/shared/distribution/distribution.js' { declare module.exports: any }
declare module '@model/contracts/shared/voting/rules.js' { declare module.exports: any }
declare module '@model/contracts/shared/voting/proposals.js' { declare module.exports: any }
declare module '@model/contracts/shared/functions.js' { declare module.exports: any }
declare module '@common/common.js' { declare module.exports: any }
declare module './model/contracts/manifests.json' { declare module.exports: any }
declare module '@model/contracts/shared/payments/index.js' { declare module.exports: any }
declare module './controller/service-worker.js' { declare module.exports: any }
declare module '@controller/instance-keys.js' { declare module.exports: any }
// @chelonia/lib
declare module '@chelonia/lib' {
    declare type ChelKeyRequestParams = {
        originatingContractID: string;
        originatingContractName: string;
        contractName: string;
        contractID: string;
        signingKeyId: string;
        innerSigningKeyId: string;
        encryptionKeyId: string;
        innerEncryptionKeyId: string;
        encryptKeyRequestMetadata?: boolean;
        permissions?: '*' | string[];
        allowedActions?: '*' | string[];
        // Arbitrary data the requester can use as reference (e.g., the hash
        // of the user-initiated action that triggered this key request)
        reference?: string;
        hooks?: {
          prepublishContract?: (msg: any) => void;
          prepublish?: (msg: any) => Promise<void>;
          postpublish?: (msg: any) => Promise<void>;
        };
        publishOptions?: { maxAttempts?: number };
        atomic: boolean;
    }
    declare module.exports: any
}
declare module '@chelonia/lib/constants' { declare module.exports: any }
declare module '@chelonia/lib/db' { declare module.exports: any }
declare module '@chelonia/lib/encryptedData' { declare module.exports: any }
declare module '@chelonia/lib/errors' { declare module.exports: any }
declare module '@chelonia/lib/events' { declare module.exports: any }
declare module '@chelonia/lib/functions' { declare module.exports: any }
declare module '@chelonia/lib/local-selectors' { declare module.exports: any }
declare module '@chelonia/lib/persistent-actions' { declare module.exports: any }
declare module '@chelonia/lib/presets' { declare module.exports: any }
declare module '@chelonia/lib/pubsub' {
    declare type JSONType = string | number | boolean | null | JSONObject | JSONArray;
    declare type JSONObject = { [key: string]: JSONType };
    declare type JSONArray = Array<JSONType>;

    declare type Message = {
        [key: string]: JSONType;
        type: string;
    }
    declare type PubMessage = {
        type: 'pub',
        channelID: string,
        data: JSONType
    }
    declare type SubMessage = {
        [key: string]: JSONType,
        type: 'sub',
        channelID: string
    } & {
        kvFilter?: Array<string>
    };
    declare type UnsubMessage = {
        [key: string]: JSONType,
        type: 'unsub',
        channelID: string
    }
    declare type NotificationTypeEnum = "entry" | "deletion" | "kv" | "kv_filter" | "ping" | "pong" | "pub" | "sub" | "unsub" | "version_info"
    declare module.exports: any
}
declare module '@chelonia/lib/Secret' {
    declare export class Secret<T> {
        constructor(T): Secret<T>;
        valueOf(): T
    }
}
declare module '@chelonia/lib/signedData' { declare module.exports: any }
declare module '@chelonia/lib/SPMessage' {
    declare interface EncryptedData<T> {}
    declare interface SignedData<T> {}
    declare interface Key {}
    declare type SPOpType = 'c' | 'a' | 'ae' | 'au' | 'ka' | 'kd' | 'ku' | 'pu' | 'ps' | 'pd' | 'ks' | 'kr' | 'krs'
    declare type SPOpValue = {}
    declare type SPOpRaw = [SPOpType, SignedData<SPOpValue>]
    declare type SPOp = {}
    declare export type SPKeyType = string;
    declare export type SPKey = Object;
    declare type ChelContractState = {}
    declare type SPMsgDirection = 'incoming' | 'outgoing'
    declare type SPHead = {
        version: '1.0.0';
        op: SPOpType;
        height: number;
        contractID: string | null;
        previousKeyOp: string | null;
        previousHEAD: string | null;
        manifest: string;
    };
    declare type SPMsgParams = {
        direction: SPMsgDirection;
        mapping: {
            key: string;
            value: string;
        };
        head: SPHead;
        signedMessageData: SignedData<SPOpValue>;
    };
    declare export class SPMessage {
        _mapping: {
            key: string;
            value: string;
        };
        _head: SPHead;
        _message: SPOpValue;
        _signedMessageData: SignedData<SPOpValue>;
        _direction: SPMsgDirection;
        _decryptedValue?: any;
        _innerSigningKeyId?: string;
        static OP_CONTRACT: "c";
        static OP_ACTION_ENCRYPTED: "ae";
        static OP_ACTION_UNENCRYPTED: "au";
        static OP_KEY_ADD: "ka";
        static OP_KEY_DEL: "kd";
        static OP_KEY_UPDATE: "ku";
        static OP_PROTOCOL_UPGRADE: "pu";
        static OP_PROP_SET: "ps";
        static OP_PROP_DEL: "pd";
        static OP_CONTRACT_AUTH: "ca";
        static OP_CONTRACT_DEAUTH: "cd";
        static OP_ATOMIC: "a";
        static OP_KEY_SHARE: "ks";
        static OP_KEY_REQUEST: "kr";
        static OP_KEY_REQUEST_SEEN: "krs";
        static createV1_0({
            contractID: string | null;
            previousHEAD?: string | null;
            previousKeyOp?: string | null;
            height?: number;
            op: SPOpRaw;
            manifest: string;
        }): SPMessage;
        static cloneWith(targetHead: SPHead, targetOp: SPOpRaw, sources: SPHead): SPMessage;
        static deserialize(value: string, additionalKeys?: { [string]: Key | string }, state?: ChelContractState): SPMessage;
        static deserializeHEAD(value: string): {
            head: SPHead;
            hash: string;
            contractID: string;
            isFirstMessage: boolean;
            description: () => string;
        };
        constructor(params: SPMsgParams): SPMessage;
        decryptedValue(): any;
        innerSigningKeyId(): string | void;
        head(): SPHead;
        message(): SPOpValue;
        op(): SPOp;
        rawOp(): SPOpRaw;
        opType(): SPOpType;
        opValue(): SPOpValue;
        signingKeyId(): string;
        manifest(): string;
        description(): string;
        isFirstMessage(): boolean;
        contractID(): string;
        serialize(): string;
        hash(): string;
        previousKeyOp(): string | null;
        height(): number;
        id(): string;
        direction(): 'incoming' | 'outgoing';
        isKeyOp(): boolean;
    }
}
declare module '@chelonia/lib/types' {
    declare type JSONType = string | number | boolean | null | JSONObject | JSONArray;
    declare type JSONObject = { [key: string]: JSONType };
    declare type JSONArray = Array<JSONType>;

    declare type ResType =
    | ResTypeErr | ResTypeOK | ResTypeAlready
    | ResTypeSub | ResTypeUnsub | ResTypeEntry | ResTypePub
    declare type ResTypeErr = 'error'
    declare type ResTypeOK = 'success'
    declare type ResTypeAlready = 'already'
    declare type ResTypeSub = 'sub'
    declare type ResTypeUnsub = 'unsub'
    declare type ResTypePub = 'pub'
    declare type ResTypeEntry = 'entry'

    // NOTE: If Flow isn't making any sense try changing this from a type to an interface!
    // https://github.com/facebook/flow/issues/3041
    declare type Response = {
    // declare interface Response {
      type: ResType;
      err?: string;
      data?: JSONType
    }
}
declare module '@chelonia/lib/utils' { declare module.exports: any }
declare module '@chelonia/lib/zkpp' { declare module.exports: any }
declare module '@chelonia/lib/zkppConstants' { declare module.exports: any }
