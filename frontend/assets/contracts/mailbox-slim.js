"use strict";

// frontend/model/contracts/mailbox.js
import {
  sbp,
  Vue,
  objectOf,
  string,
  object,
  optional,
  mailType
} from "/assets/js/common.js";
sbp("chelonia/defineContract", {
  name: "gi.contracts/mailbox",
  metadata: {
    validate: objectOf({
      createdDate: string
    }),
    create() {
      return {
        createdDate: new Date().toISOString()
      };
    }
  },
  actions: {
    "gi.contracts/mailbox": {
      validate: object,
      process({ data }, { state }) {
        for (const key in data) {
          Vue.set(state, key, data[key]);
        }
        Vue.set(state, "messages", []);
      }
    },
    "gi.contracts/mailbox/postMessage": {
      validate: objectOf({
        messageType: mailType,
        from: string,
        subject: optional(string),
        message: optional(string),
        headers: optional(object)
      }),
      process(message, { state }) {
        state.messages.push(message);
      }
    },
    "gi.contracts/mailbox/authorizeSender": {
      validate: objectOf({
        sender: string
      }),
      process({ data }, { state }) {
        throw new Error("unimplemented!");
      }
    }
  }
});
