/* eslint-env mocha */

// For rapid development, run these tests with:
// ./node_modules/.bin/mocha -w -R min --require Gruntfile.js frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import { groupIncomeDistributionLogic,groupIncomeDistributionAdjustFirstLogic, groupIncomeDistributionNewLogic, dataToEvents } from './group-income-distribution.js'

describe("Chunk 0: Adjustment Tests",
  function () {
      it(
          "//=============SCENARIO 1=============\n" +
          "// can distribute income evenly with two users\n" +
          "// has no effect for adjustment when there are no payments\n" +
          "// mincome: 12\n" +
          "// u1: pledge 10$\n" +
          "// u2: Income 10$ (a.k.a needs $2)\n" +
          "// Expected: [{ amount: 2, from: 'u1', to: 'u2' }]",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNUiQmNWvkcpVH9Ysr93RYzTqrchj7nhh8jh7FAFHkyUxb", "joinedDate": "2020-11-28T20:08:58.594Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 10, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNK6u9JWijS8ZYxVjQcbHM8sg6qEdn37P31YxB1GtSSGsE", "joinedDate": "2020-11-28T20:09:11.381Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 10, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 12, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } },
                      currentGroupState: { "payments": {}, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } }, "invites": { "4239": { "inviteSecret": "4239", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 12, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNUiQmNWvkcpVH9Ysr93RYzTqrchj7nhh8jh7FAFHkyUxb", "joinedDate": "2020-11-28T20:08:58.594Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 10, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNK6u9JWijS8ZYxVjQcbHM8sg6qEdn37P31YxB1GtSSGsE", "joinedDate": "2020-11-28T20:09:11.381Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 10, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([
                  { amount: 2, from: 'u1', to: 'u2' }
              ])
          })
      it(
          "//=============SCENARIO 2=============\n" +
          "// ignores existing payments when not adjusted\n" +
          "// mincome: 12\n" +
          "// u1: pledge 10$\n" +
          "// u2: Income 10$ (a.k.a needs $2)\n" +
          "// u1: sends u2 $2\n" +
          "// Expected: [{ amount: 2, from: 'u1', to: 'u2' }]",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNUiQmNWvkcpVH9Ysr93RYzTqrchj7nhh8jh7FAFHkyUxb", "joinedDate": "2020-11-28T20:08:58.594Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 10, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNK6u9JWijS8ZYxVjQcbHM8sg6qEdn37P31YxB1GtSSGsE", "joinedDate": "2020-11-28T20:09:11.381Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 10, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 12, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNNisySNAbG6jqky2aD4fWWSJHKhZKXmQj5DDr3KkHAqJf"] } }, "lastAdjustedDistribution": [{ "amount": 2, "from": "u1", "to": "u2" }] } },
                      currentGroupState: { "payments": { "21XWnNNisySNAbG6jqky2aD4fWWSJHKhZKXmQj5DDr3KkHAqJf": { "data": { "toUser": "u2", "amount": 2, "total": 2, "partial": false, "currencyFromTo": ["USD", "USD"], "groupMincome": 12, "exchangeRate": 1, "txid": "0.8027656011970912", "status": "completed", "paymentType": "manual", "completedDate": "2020-11-28T20:11:33.588Z" }, "meta": { "createdDate": "2020-11-28T20:11:33.534Z", "username": "u1", "identityContractID": "21XWnNUiQmNWvkcpVH9Ysr93RYzTqrchj7nhh8jh7FAFHkyUxb" }, "history": [["2020-11-28T20:11:33.534Z", "21XWnNNisySNAbG6jqky2aD4fWWSJHKhZKXmQj5DDr3KkHAqJf"], ["2020-11-28T20:11:33.588Z", "21XWnNGUBCtv4nzZKvACcuvVDY1q94q6MmroUdFSQFdoTX4n8n"]] } }, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNNisySNAbG6jqky2aD4fWWSJHKhZKXmQj5DDr3KkHAqJf"] } }, "lastAdjustedDistribution": [{ "amount": 2, "from": "u1", "to": "u2" }] } }, "invites": { "4239": { "inviteSecret": "4239", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 12, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNUiQmNWvkcpVH9Ysr93RYzTqrchj7nhh8jh7FAFHkyUxb", "joinedDate": "2020-11-28T20:08:58.594Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 10, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNK6u9JWijS8ZYxVjQcbHM8sg6qEdn37P31YxB1GtSSGsE", "joinedDate": "2020-11-28T20:09:11.381Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 10, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: undefined
              })
              should(dist).eql([
                  { amount: 2, from: 'u1', to: 'u2' }
              ])
          })
      it(
          "//=============SCENARIO 3=============\n" +
          "// takes into account payments from this month when adjusted\n" +
          "// mincome: 12\n" +
          "// u1: pledge 10$\n" +
          "// u2: Income 10$ (a.k.a needs $2)\n" +
          "// u1: sends u2 $2\n" +
          "// Expected: []",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNUiQmNWvkcpVH9Ysr93RYzTqrchj7nhh8jh7FAFHkyUxb", "joinedDate": "2020-11-28T20:08:58.594Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 10, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNK6u9JWijS8ZYxVjQcbHM8sg6qEdn37P31YxB1GtSSGsE", "joinedDate": "2020-11-28T20:09:11.381Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 10, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 12, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNNisySNAbG6jqky2aD4fWWSJHKhZKXmQj5DDr3KkHAqJf"] } }, "lastAdjustedDistribution": [{ "amount": 2, "from": "u1", "to": "u2" }] } },
                      currentGroupState: { "payments": { "21XWnNNisySNAbG6jqky2aD4fWWSJHKhZKXmQj5DDr3KkHAqJf": { "data": { "toUser": "u2", "amount": 2, "total": 2, "partial": false, "currencyFromTo": ["USD", "USD"], "groupMincome": 12, "exchangeRate": 1, "txid": "0.8027656011970912", "status": "completed", "paymentType": "manual", "completedDate": "2020-11-28T20:11:33.588Z" }, "meta": { "createdDate": "2020-11-28T20:11:33.534Z", "username": "u1", "identityContractID": "21XWnNUiQmNWvkcpVH9Ysr93RYzTqrchj7nhh8jh7FAFHkyUxb" }, "history": [["2020-11-28T20:11:33.534Z", "21XWnNNisySNAbG6jqky2aD4fWWSJHKhZKXmQj5DDr3KkHAqJf"], ["2020-11-28T20:11:33.588Z", "21XWnNGUBCtv4nzZKvACcuvVDY1q94q6MmroUdFSQFdoTX4n8n"]] } }, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNNisySNAbG6jqky2aD4fWWSJHKhZKXmQj5DDr3KkHAqJf"] } }, "lastAdjustedDistribution": [{ "amount": 2, "from": "u1", "to": "u2" }] } }, "invites": { "4239": { "inviteSecret": "4239", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 12, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 57 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNUiQmNWvkcpVH9Ysr93RYzTqrchj7nhh8jh7FAFHkyUxb", "joinedDate": "2020-11-28T20:08:58.594Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 10, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNK6u9JWijS8ZYxVjQcbHM8sg6qEdn37P31YxB1GtSSGsE", "joinedDate": "2020-11-28T20:09:11.381Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 10, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([])
          }
      )
  }
)
describe("Chunk A: When someone updates their income details",
  function () {
      it(
          "// after a payment is already made:\n" +
          "//=============[SCENARIO 1]=============\n" +
          "// Create a group with $1000 mincome and 3 members\n" +
          "// u1: pledge 100$\n" +
          "// u2: Income 925$ (a.k.a needs $75)\n" +
          "// u3: no income details added.\n" +
          "// Login u1 and send $75 to u2. - The payment goes as expected.\n" +
          "// Switch to u3 and add income details: Income 950$ (a.k.a needs $50)\n" +
          "// Expected Result: Should receive only $25 from u1 (100 - 75)\n" +
          "// Switch to u1 and go to the payments page.\n" +
          "// Expected Result: It should show 1 payment to u3 of $25. The sidebar should say \"Amount sent $75 of $100\"",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNFVLFSCSqnHqUmkMJN3AzLsCae6HC2tkczye1J92AfBqy", "joinedDate": "2020-11-28T20:16:52.282Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNKqb2nRZRP5N7LmkYdAzNQ5wia7eYvR9uq4naJ3jZbjp1", "joinedDate": "2020-11-28T20:17:09.617Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 925, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNL5Xh1S43BRwupsYLynYV7zFbF3NygMxQT3JkR4ZTT9KV", "joinedDate": "2020-11-28T20:17:12.510Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNRQdWSgjar3AF1mUu3JQc9ryF7M3Eu3QVj6E2x3gcvRS8"] } }, "lastAdjustedDistribution": [{ "amount": 75, "from": "u1", "to": "u2" }] } },
                      currentGroupState: { "payments": { "21XWnNRQdWSgjar3AF1mUu3JQc9ryF7M3Eu3QVj6E2x3gcvRS8": { "data": { "toUser": "u2", "amount": 75, "total": 75, "partial": false, "currencyFromTo": ["USD", "USD"], "groupMincome": 1000, "exchangeRate": 1, "txid": "0.03243752953235568", "status": "completed", "paymentType": "manual", "completedDate": "2020-11-28T20:18:23.240Z" }, "meta": { "createdDate": "2020-11-28T20:18:23.190Z", "username": "u1", "identityContractID": "21XWnNFVLFSCSqnHqUmkMJN3AzLsCae6HC2tkczye1J92AfBqy" }, "history": [["2020-11-28T20:18:23.190Z", "21XWnNRQdWSgjar3AF1mUu3JQc9ryF7M3Eu3QVj6E2x3gcvRS8"], ["2020-11-28T20:18:23.240Z", "21XWnNGaNZcUa47wNEYd5Zsg52zdtRauvp8umLsou1kaAGnCWD"]] } }, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNRQdWSgjar3AF1mUu3JQc9ryF7M3Eu3QVj6E2x3gcvRS8"] } }, "lastAdjustedDistribution": [{ "amount": 75, "from": "u1", "to": "u2" }] } }, "invites": { "6969": { "inviteSecret": "6969", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true, "u3": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNFVLFSCSqnHqUmkMJN3AzLsCae6HC2tkczye1J92AfBqy", "joinedDate": "2020-11-28T20:16:52.282Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNKqb2nRZRP5N7LmkYdAzNQ5wia7eYvR9uq4naJ3jZbjp1", "joinedDate": "2020-11-28T20:17:09.617Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 925, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNL5Xh1S43BRwupsYLynYV7zFbF3NygMxQT3JkR4ZTT9KV", "joinedDate": "2020-11-28T20:17:12.510Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([
                { amount: 25, from: 'u1', to: 'u3' }
              ])
          })
      it(
          "//=============[SCENARIO 2]=============\n" +
          "// Create a group with $1000 mincome and 3 members:\n" +
          "// u1: pledge 100$\n" +
          "// u2: Income 900$ (a.k.a needs $100)\n" +
          "// u3: no income details added.\n" +
          "// Login u1 and send $100 to u2. - The payment goes as expected.\n" +
          "// Switch to u3 and add income details: Income 950$ (a.k.a needs $50)\n" +
          "// Expected Result: Should not receive anything from u1 because u1 already pledge all their money to u2.\n" +
          "// Switch to u1 and go to the payments page.\n" +
          "// Expected Result: Don't show any \"todo\" payments. The sidebar should say \"Amount sent $100 of $100\"",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNWAANkjJ8KGNaGneQCpfCYiCmd26b3hs5XgNA8ewWoSGf", "joinedDate": "2020-11-28T20:40:06.126Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNQyvKV9pGf2jEkKDxTq4WAJpPkR7w2mRx6FJxV6numHqk", "joinedDate": "2020-11-28T20:40:21.130Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNY4PS72fvyoVejG8M7TjiivBNWtjS7Fay4bJivFpC5XY8", "joinedDate": "2020-11-28T20:40:23.678Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNG3yeYasHDNNPEcoVK1y1uTUt1oiDSz2HMiq4cic3TEh7"] } }, "lastAdjustedDistribution": [{ "amount": 100, "from": "u1", "to": "u2" }] } },
                      currentGroupState: { "payments": { "21XWnNG3yeYasHDNNPEcoVK1y1uTUt1oiDSz2HMiq4cic3TEh7": { "data": { "toUser": "u2", "amount": 100, "total": 100, "partial": false, "currencyFromTo": ["USD", "USD"], "groupMincome": 1000, "exchangeRate": 1, "txid": "0.7074241257245937", "status": "completed", "paymentType": "manual", "completedDate": "2020-11-28T20:41:24.210Z" }, "meta": { "createdDate": "2020-11-28T20:41:24.168Z", "username": "u1", "identityContractID": "21XWnNWAANkjJ8KGNaGneQCpfCYiCmd26b3hs5XgNA8ewWoSGf" }, "history": [["2020-11-28T20:41:24.168Z", "21XWnNG3yeYasHDNNPEcoVK1y1uTUt1oiDSz2HMiq4cic3TEh7"], ["2020-11-28T20:41:24.210Z", "21XWnNFPEgVmpUZ186hPdr4iewWdBZzDRNWbEkpZBCuRhXKAC1"]] } }, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNG3yeYasHDNNPEcoVK1y1uTUt1oiDSz2HMiq4cic3TEh7"] } }, "lastAdjustedDistribution": [{ "amount": 100, "from": "u1", "to": "u2" }] } }, "invites": { "203": { "inviteSecret": "203", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true, "u3": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 58 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNWAANkjJ8KGNaGneQCpfCYiCmd26b3hs5XgNA8ewWoSGf", "joinedDate": "2020-11-28T20:40:06.126Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNQyvKV9pGf2jEkKDxTq4WAJpPkR7w2mRx6FJxV6numHqk", "joinedDate": "2020-11-28T20:40:21.130Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNY4PS72fvyoVejG8M7TjiivBNWtjS7Fay4bJivFpC5XY8", "joinedDate": "2020-11-28T20:40:23.678Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([

              ])
          })
      it(
          "//=============[SCENARIO 3]=============\n" +
          "// Create a group with $1000 mincome and 3 members:\n" +
          "// u1: pledge 100$\n" +
          "// u2: Income 950$ (a.k.a needs $50)\n" +
          "// u3: no income details added.\n" +
          "// Login u1 and send $25 to u2 (a partial payment). - The payment goes as expected.\n" +
          "// Switch to u3 and add income details: Income 700$ (a.k.a needs $300)\n" +
          "// Expected Result: It shows \"You'll receive $75\" in the graphic summary. Why? It's the result of 85.71 - (25 - 14.29).The u2 now should only receive $14.29 instead of the needed $50.But u1 already sent $25, so the difference should be discounted from $85.71.\n" +
          "// Switch to u1 and go to the payments page.\n" +
          "// Expected Result: most of the $75 would go to u3, and some of it would go to u2",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNTdJo5423dxQbFwk5wuB2LSfTs2aRJeQwgXk8Q3migLWw", "joinedDate": "2020-11-28T20:45:16.739Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNHQe2UU2Kuxfpp4UCLixCjFMCXuZX8sAdih3YRoFnBmkn", "joinedDate": "2020-11-28T20:45:38.609Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNKwxCSjHFj62FQmDgsLm3T55CpzaFupQ3xrhcTxdg8Tiu", "joinedDate": "2020-11-28T20:45:55.863Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 700, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNQty9zFmMY89Z4Ju82UKvGRDqmVALWUeaLDcm61mvEQzi"] } }, "lastAdjustedDistribution": [{ "amount": 50, "from": "u1", "to": "u2" }] } },
                      currentGroupState: { "payments": { "21XWnNQty9zFmMY89Z4Ju82UKvGRDqmVALWUeaLDcm61mvEQzi": { "data": { "toUser": "u2", "amount": 25, "total": 50, "partial": false, "currencyFromTo": ["USD", "USD"], "groupMincome": 1000, "exchangeRate": 1, "txid": "0.5789766412244682", "status": "completed", "paymentType": "manual", "completedDate": "2020-11-28T20:46:35.315Z" }, "meta": { "createdDate": "2020-11-28T20:46:35.258Z", "username": "u1", "identityContractID": "21XWnNTdJo5423dxQbFwk5wuB2LSfTs2aRJeQwgXk8Q3migLWw" }, "history": [["2020-11-28T20:46:35.258Z", "21XWnNQty9zFmMY89Z4Ju82UKvGRDqmVALWUeaLDcm61mvEQzi"], ["2020-11-28T20:46:35.315Z", "21XWnNRBbisDUrXsquXWpwPvbWwZKyy5CqVssapyvwkCTNrdS1"]] } }, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNQty9zFmMY89Z4Ju82UKvGRDqmVALWUeaLDcm61mvEQzi"] } }, "lastAdjustedDistribution": [{ "amount": 50, "from": "u1", "to": "u2" }] } }, "invites": { "7224": { "inviteSecret": "7224", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true, "u3": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNTdJo5423dxQbFwk5wuB2LSfTs2aRJeQwgXk8Q3migLWw", "joinedDate": "2020-11-28T20:45:16.739Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNHQe2UU2Kuxfpp4UCLixCjFMCXuZX8sAdih3YRoFnBmkn", "joinedDate": "2020-11-28T20:45:38.609Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNKwxCSjHFj62FQmDgsLm3T55CpzaFupQ3xrhcTxdg8Tiu", "joinedDate": "2020-11-28T20:45:55.863Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 700, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([
                { amount: 5.769230769230769, from: 'u1', to: 'u2' },
                { amount: 69.23076923076924, from: 'u1', to: 'u3' }
              ])
          })
      it.skip(
          "//=============[SCENARIO 4]=============\n" +
          "//ignores users who updated income after paying and can no longer pay\n" +
          "// Create a group with $1000 mincome and 3 members:\n" +
          "// u1: pledge 100$\n" +
          "// u2: income 950$ (a.k.a needs $50)\n" +
          "// u3: income 900$ (a.k.a needs $100)\n" +
          "// Login u1 and send $50 to u3 (a partial payment). - The payment goes as expected.\n" +
          "// Change the pledge amount of u1 from $100 to $50.\n" +
          "// Expected Result: Don't show any payment to u3 because u1 already pledge all their money.",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNNwA4dhSnjaY2agWApCMsLkmwWBUoGykCd7A2aAqHLLfv", "joinedDate": "2020-11-28T20:50:39.663Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNU1xiwjezp4x5eR1bds3DXVPtA51VP4mRDfaYVUteELW5", "joinedDate": "2020-11-28T20:50:54.461Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNSwHVWHgeMqNszo1WnYPG5VbFFUJMT9yZxtknpCx6z8tE", "joinedDate": "2020-11-28T20:50:58.248Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } },
                      currentGroupState: { "payments": {}, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } }, "invites": { "6381": { "inviteSecret": "6381", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true, "u3": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNNwA4dhSnjaY2agWApCMsLkmwWBUoGykCd7A2aAqHLLfv", "joinedDate": "2020-11-28T20:50:39.663Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNU1xiwjezp4x5eR1bds3DXVPtA51VP4mRDfaYVUteELW5", "joinedDate": "2020-11-28T20:50:54.461Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNSwHVWHgeMqNszo1WnYPG5VbFFUJMT9yZxtknpCx6z8tE", "joinedDate": "2020-11-28T20:50:58.248Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: undefined
              })
              should(dist).eql([
                 //TODO: it appeas as though the system is passing parameters to our function which do not reflect the change in u1's pledge amount.
              ])
          })
      it(
          "//=============[SCENARIO 4.1 (continuation)]=============\n" +
          "//can distribute money from new members\n" +
          "// Invite a new member u4, who can pledge $150.\n" +
          "// Expected Result #1: u4 should be asked to send $50 to u2 and $50 to u3.\n" +
          "// Expected Result #2: u3's payments page should say \"Amount received $50 out of $100\".\n" +
          "// Expected Result #3: u1 should have no \"todo\" payments because u1 already pledge all their money.",

          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNNwA4dhSnjaY2agWApCMsLkmwWBUoGykCd7A2aAqHLLfv", "joinedDate": "2020-11-28T20:50:39.663Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 50, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNU1xiwjezp4x5eR1bds3DXVPtA51VP4mRDfaYVUteELW5", "joinedDate": "2020-11-28T20:50:54.461Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNSwHVWHgeMqNszo1WnYPG5VbFFUJMT9yZxtknpCx6z8tE", "joinedDate": "2020-11-28T20:50:58.248Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] }, "u4": { "globalUsername": "", "contractID": "21XWnNRaSdVdaaQrnjwuWtxXdYvEAwj6h4iRVzi56ZUZBKkskC", "joinedDate": "2020-11-28T20:58:26.971Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 150, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u3": ["21XWnNQcbwyJCF5Vgjjft9MGbuZvzSkffXi7vWwLt1JQxSC9x6"] } }, "lastAdjustedDistribution": [{ "amount": 33.33333333, "from": "u1", "to": "u2" }, { "amount": 66.66666667, "from": "u1", "to": "u3" }] } },
                      currentGroupState: { "payments": { "21XWnNQcbwyJCF5Vgjjft9MGbuZvzSkffXi7vWwLt1JQxSC9x6": { "data": { "toUser": "u3", "amount": 50, "total": 66.66666667, "partial": false, "currencyFromTo": ["USD", "USD"], "groupMincome": 1000, "exchangeRate": 1, "txid": "0.7328999704023759", "status": "completed", "paymentType": "manual", "completedDate": "2020-11-28T20:53:17.356Z" }, "meta": { "createdDate": "2020-11-28T20:53:17.286Z", "username": "u1", "identityContractID": "21XWnNNwA4dhSnjaY2agWApCMsLkmwWBUoGykCd7A2aAqHLLfv" }, "history": [["2020-11-28T20:53:17.286Z", "21XWnNQcbwyJCF5Vgjjft9MGbuZvzSkffXi7vWwLt1JQxSC9x6"], ["2020-11-28T20:53:17.356Z", "21XWnNMJFHMWtf9u6qQgQadBqVathXTLbQ1JNGvKQmoZYP9dfp"]] } }, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u3": ["21XWnNQcbwyJCF5Vgjjft9MGbuZvzSkffXi7vWwLt1JQxSC9x6"] } }, "lastAdjustedDistribution": [{ "amount": 33.33333333, "from": "u1", "to": "u2" }, { "amount": 66.66666667, "from": "u1", "to": "u3" }] } }, "invites": { "897": { "inviteSecret": "897", "quantity": 1, "creator": "u1", "invitee": "u4", "status": "used", "responses": { "u4": true }, "expires": 1638588240000 }, "6381": { "inviteSecret": "6381", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true, "u3": true }, "expires": 1638588240000 } }, "proposals": { "21XWnNHK79SFrHwX9gNvRdG5onwxDYQZJQ5jDv4SgXtAds1DHv": { "data": { "proposalType": "invite-member", "proposalData": { "member": "u4", "reason": "" }, "votingRule": "disagreement", "expires_date_ms": 1607806677507 }, "meta": { "createdDate": "2020-11-28T20:57:57.532Z", "username": "u1", "identityContractID": "21XWnNNwA4dhSnjaY2agWApCMsLkmwWBUoGykCd7A2aAqHLLfv" }, "votes": { "u1": ":for", "u2": ":for" }, "status": "passed", "payload": { "inviteSecret": "897", "quantity": 1, "creator": "u1", "invitee": "u4", "status": "used", "responses": { "u4": true }, "expires": 1638588240000 } } }, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNKkbnY1qeYr5eVbRmEoDLZuVYz1qM8kRh432rwSy2nrzx?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNNwA4dhSnjaY2agWApCMsLkmwWBUoGykCd7A2aAqHLLfv", "joinedDate": "2020-11-28T20:50:39.663Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 50, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNU1xiwjezp4x5eR1bds3DXVPtA51VP4mRDfaYVUteELW5", "joinedDate": "2020-11-28T20:50:54.461Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNSwHVWHgeMqNszo1WnYPG5VbFFUJMT9yZxtknpCx6z8tE", "joinedDate": "2020-11-28T20:50:58.248Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] }, "u4": { "globalUsername": "", "contractID": "21XWnNRaSdVdaaQrnjwuWtxXdYvEAwj6h4iRVzi56ZUZBKkskC", "joinedDate": "2020-11-28T20:58:26.971Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 150, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([
                { amount: 50, from: 'u4', to: 'u2' },
                { amount: 50, from: 'u4', to: 'u3' }
              ])
          }
      )
  }
)
describe("Chunk B: Changing group mincome",
  function () {
      it(
          "//=============[SCENARIO 1]=============\n" +
          "// Create a group with $1000 mincome and 2 members:\n" +
          "// u1: pledge 100$\n" +
          "// u2: Income 950$ (a.k.a needs $50)\n" +
          "// Change the mincome from $1000 to $500\n" +
          "// Expected Result: I don't know... we never discussed this.",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNWJnfeFtUobwn4HCGo57sZxrrWa8pVTEGNedU6CpXSpsJ", "joinedDate": "2020-11-28T21:03:38.876Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNN9thB38wmG6p1uv9Y4zkvRab6kL6RH3mN2GJSY9cYmJp", "joinedDate": "2020-11-28T21:03:55.762Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 500, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } },
                      currentGroupState: { "payments": {}, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } }, "invites": { "9009": { "inviteSecret": "9009", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 500, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNWJnfeFtUobwn4HCGo57sZxrrWa8pVTEGNedU6CpXSpsJ", "joinedDate": "2020-11-28T21:03:38.876Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNN9thB38wmG6p1uv9Y4zkvRab6kL6RH3mN2GJSY9cYmJp", "joinedDate": "2020-11-28T21:03:55.762Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 950, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: undefined
              })
              should(dist).eql([
                { amount: 100, from: 'u1', to: 'u2' } 
              ])
          })
      it(
          "//=============[SCENARIO 2]=============\n" +
          "// Create a group with $500 mincome and 2 members:\n" +
          "// u1: pledge 100$\n" +
          "// u2: Income 450$ (a.k.a needs $50)\n" +
          "// Change the mincome from $500 to $750\n" +
          "// Expected Result: Same, no idea.",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNY1iRSoXa3SNHbYMMZfUj6oQBaGVSgxZZjRcQTua7vMwX", "joinedDate": "2020-11-28T21:09:48.008Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNVT8BwYZfyx97HNZvVMTzMFoMj42qVfXR4E6P9i6z5AX2", "joinedDate": "2020-11-28T21:10:08.457Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 450, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 750, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } },
                      currentGroupState: { "payments": {}, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } }, "invites": { "922": { "inviteSecret": "922", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "us", "groupPicture": "http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 750, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNY1iRSoXa3SNHbYMMZfUj6oQBaGVSgxZZjRcQTua7vMwX", "joinedDate": "2020-11-28T21:09:48.008Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 100, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNVT8BwYZfyx97HNZvVMTzMFoMj42qVfXR4E6P9i6z5AX2", "joinedDate": "2020-11-28T21:10:08.457Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 450, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([
                { amount: 100, from: 'u1', to: 'u2' }
              ])
          }
      )
  }
)
describe("Chunk C: 4-way distribution tests",
  function () {
      it(
          "//=============[SCENARIO 1]=============\n" +
          "// splits money evenly between two pledgers and two needers\n" +
          "// u1: pledge 250$\n" +
          "// u2: Income 900$ (a.k.a needs $100)\n" +
          "// u3: Income 759$ (a.k.a needs $250)\n" +
          "// u4: pledge 250$\n" +
          "// Expected Result: Same, no idea.",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNXc5uwULhz77j5o54xonZdASLdWM9YMrEkf2nYNbGaddN", "joinedDate": "2020-11-28T21:16:09.521Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 250, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNN9SEzyocW8hYQ3tQP2DR8vcWZq4FYELLJKqXptVtJHZi", "joinedDate": "2020-11-28T21:16:30.372Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNRqy2AcvnCZgaBeC75kMEKe7Kk6f7yT8kAcAeuhwqMKmq", "joinedDate": "2020-11-28T21:16:31.876Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 750, "paymentMethods": [] }, "u4": { "globalUsername": "", "contractID": "21XWnNY9cwKdkMK5Cxuf2ZYB7s2yPRLb4Cn6kpYtCrwvTcpFSR", "joinedDate": "2020-11-28T21:16:36.146Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 250, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "uus", "groupPicture": "http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } },
                      currentGroupState: { "payments": {}, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": {}, "lastAdjustedDistribution": null } }, "invites": { "221": { "inviteSecret": "221", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true, "u3": true, "u4": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "uus", "groupPicture": "http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNXc5uwULhz77j5o54xonZdASLdWM9YMrEkf2nYNbGaddN", "joinedDate": "2020-11-28T21:16:09.521Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 250, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNN9SEzyocW8hYQ3tQP2DR8vcWZq4FYELLJKqXptVtJHZi", "joinedDate": "2020-11-28T21:16:30.372Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNRqy2AcvnCZgaBeC75kMEKe7Kk6f7yT8kAcAeuhwqMKmq", "joinedDate": "2020-11-28T21:16:31.876Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 750, "paymentMethods": [] }, "u4": { "globalUsername": "", "contractID": "21XWnNY9cwKdkMK5Cxuf2ZYB7s2yPRLb4Cn6kpYtCrwvTcpFSR", "joinedDate": "2020-11-28T21:16:36.146Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 250, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([
                { amount: 50, from: 'u1', to: 'u2' },
                { amount: 25, from: 'u4', to: 'u2' },
                { amount: 125, from: 'u1', to: 'u3' },
                { amount: 62.5, from: 'u4', to: 'u3' }
              ])
          })
      it(
          "//=============[SCENARIO 2]=============\n" +
          "// stops asking user to pay someone they fully paid their share to\n" +
          "// u1 fully pays their share to u2\n" +
          "// Expected Result: Same, no idea.",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                      groupProfiles: { "u1": { "globalUsername": "", "contractID": "21XWnNXc5uwULhz77j5o54xonZdASLdWM9YMrEkf2nYNbGaddN", "joinedDate": "2020-11-28T21:16:09.521Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 250, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNN9SEzyocW8hYQ3tQP2DR8vcWZq4FYELLJKqXptVtJHZi", "joinedDate": "2020-11-28T21:16:30.372Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNRqy2AcvnCZgaBeC75kMEKe7Kk6f7yT8kAcAeuhwqMKmq", "joinedDate": "2020-11-28T21:16:31.876Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 750, "paymentMethods": [] }, "u4": { "globalUsername": "", "contractID": "21XWnNY9cwKdkMK5Cxuf2ZYB7s2yPRLb4Cn6kpYtCrwvTcpFSR", "joinedDate": "2020-11-28T21:16:36.146Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 250, "paymentMethods": [] } },
                      groupSettings: { "groupCreator": "u1", "groupName": "uus", "groupPicture": "http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } },
                      monthlyPayments: { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNGNqanzZMeuJvA1zuDBGfJmkrmi4HhNe1qARni5Lbdotj"] } }, "lastAdjustedDistribution": [{ "amount": 50, "from": "u1", "to": "u2" }, { "amount": 125, "from": "u1", "to": "u3" }, { "amount": 50, "from": "u4", "to": "u2" }, { "amount": 125, "from": "u4", "to": "u3" }] } },
                      currentGroupState: { "payments": { "21XWnNGNqanzZMeuJvA1zuDBGfJmkrmi4HhNe1qARni5Lbdotj": { "data": { "toUser": "u2", "amount": 50, "total": 50, "partial": false, "currencyFromTo": ["USD", "USD"], "groupMincome": 1000, "exchangeRate": 1, "txid": "0.5957740209259536", "status": "completed", "paymentType": "manual", "completedDate": "2020-11-28T21:19:10.447Z" }, "meta": { "createdDate": "2020-11-28T21:19:10.325Z", "username": "u1", "identityContractID": "21XWnNXc5uwULhz77j5o54xonZdASLdWM9YMrEkf2nYNbGaddN" }, "history": [["2020-11-28T21:19:10.325Z", "21XWnNGNqanzZMeuJvA1zuDBGfJmkrmi4HhNe1qARni5Lbdotj"], ["2020-11-28T21:19:10.447Z", "21XWnNNgkHye4Unf4vRxCy5aZF2t5KYPS6uCdXftUhj5pRaVct"]] } }, "paymentsByMonth": { "2020-11": { "firstMonthsCurrency": "USD", "mincomeExchangeRate": 1, "paymentsFrom": { "u1": { "u2": ["21XWnNGNqanzZMeuJvA1zuDBGfJmkrmi4HhNe1qARni5Lbdotj"] } }, "lastAdjustedDistribution": [{ "amount": 50, "from": "u1", "to": "u2" }, { "amount": 125, "from": "u1", "to": "u3" }, { "amount": 50, "from": "u4", "to": "u2" }, { "amount": 125, "from": "u4", "to": "u3" }] } }, "invites": { "221": { "inviteSecret": "221", "quantity": 60, "creator": "INVITE_INITIAL_CREATOR", "status": "valid", "responses": { "u2": true, "u3": true, "u4": true }, "expires": 1638588240000 } }, "proposals": {}, "settings": { "groupCreator": "u1", "groupName": "uus", "groupPicture": "http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg", "sharedValues": "", "mincomeAmount": 1000, "mincomeCurrency": "USD", "proposals": { "group-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "invite-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "remove-member": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "proposal-setting-change": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } }, "generic": { "rule": "disagreement", "expires_ms": 1209600000, "ruleSettings": { "percentage": { "threshold": 0.75 }, "disagreement": { "threshold": 60 } } } } }, "profiles": { "u1": { "globalUsername": "", "contractID": "21XWnNXc5uwULhz77j5o54xonZdASLdWM9YMrEkf2nYNbGaddN", "joinedDate": "2020-11-28T21:16:09.521Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 250, "paymentMethods": [] }, "u2": { "globalUsername": "", "contractID": "21XWnNN9SEzyocW8hYQ3tQP2DR8vcWZq4FYELLJKqXptVtJHZi", "joinedDate": "2020-11-28T21:16:30.372Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 900, "paymentMethods": [] }, "u3": { "globalUsername": "", "contractID": "21XWnNRqy2AcvnCZgaBeC75kMEKe7Kk6f7yT8kAcAeuhwqMKmq", "joinedDate": "2020-11-28T21:16:31.876Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "incomeAmount", "incomeAmount": 750, "paymentMethods": [] }, "u4": { "globalUsername": "", "contractID": "21XWnNY9cwKdkMK5Cxuf2ZYB7s2yPRLb4Cn6kpYtCrwvTcpFSR", "joinedDate": "2020-11-28T21:16:36.146Z", "nonMonetaryContributions": [], "status": "active", "departedDate": null, "incomeDetailsType": "pledgeAmount", "pledgeAmount": 250, "paymentMethods": [] } } },
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([
                //TODO: The full payment does not eliminate the amounts owed by u1 to u2
                { amount: 22.22222222222222, from: 'u1', to: 'u2' },
                { amount: 15.4320987654321, from: 'u4', to: 'u2' },
                { amount: 111.1111111111111, from: 'u1', to: 'u3' },
                { amount: 77.16049382716051, from: 'u4', to: 'u3' }
              ])
          })
      it(
          "//=============[SCENARIO 3]=============\n" +
          "// does not ask users who have paid their full share to pay any more\n" +
          "// u1 pays their share to u3\n" +
          "// Expected Result: Same, no idea.",
          function () {
              const dist = groupIncomeDistributionAdjustFirstLogic({
                  getters:
                  {
                    groupProfiles: {"u1":{"globalUsername":"","contractID":"21XWnNXc5uwULhz77j5o54xonZdASLdWM9YMrEkf2nYNbGaddN","joinedDate":"2020-11-28T21:16:09.521Z","nonMonetaryContributions":[],"status":"active","departedDate":null,"incomeDetailsType":"pledgeAmount","pledgeAmount":250,"paymentMethods":[]},"u2":{"globalUsername":"","contractID":"21XWnNN9SEzyocW8hYQ3tQP2DR8vcWZq4FYELLJKqXptVtJHZi","joinedDate":"2020-11-28T21:16:30.372Z","nonMonetaryContributions":[],"status":"active","departedDate":null,"incomeDetailsType":"incomeAmount","incomeAmount":900,"paymentMethods":[]},"u3":{"globalUsername":"","contractID":"21XWnNRqy2AcvnCZgaBeC75kMEKe7Kk6f7yT8kAcAeuhwqMKmq","joinedDate":"2020-11-28T21:16:31.876Z","nonMonetaryContributions":[],"status":"active","departedDate":null,"incomeDetailsType":"incomeAmount","incomeAmount":750,"paymentMethods":[]},"u4":{"globalUsername":"","contractID":"21XWnNY9cwKdkMK5Cxuf2ZYB7s2yPRLb4Cn6kpYtCrwvTcpFSR","joinedDate":"2020-11-28T21:16:36.146Z","nonMonetaryContributions":[],"status":"active","departedDate":null,"incomeDetailsType":"pledgeAmount","pledgeAmount":250,"paymentMethods":[]}},
                    groupSettings: {"groupCreator":"u1","groupName":"uus","groupPicture":"http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg","sharedValues":"","mincomeAmount":1000,"mincomeCurrency":"USD","proposals":{"group-setting-change":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}},"invite-member":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}},"remove-member":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}},"proposal-setting-change":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}},"generic":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}}}},
                    monthlyPayments: {"2020-11":{"firstMonthsCurrency":"USD","mincomeExchangeRate":1,"paymentsFrom":{"u1":{"u2":["21XWnNGNqanzZMeuJvA1zuDBGfJmkrmi4HhNe1qARni5Lbdotj"],"u3":["21XWnNMjLqLeQiUn31Ewup7WPbFSvFmRiFi2u7KfQj4z5SNNGt"]}},"lastAdjustedDistribution":[{"amount":50,"from":"u1","to":"u2"},{"amount":125,"from":"u1","to":"u3"},{"amount":50,"from":"u4","to":"u2"},{"amount":125,"from":"u4","to":"u3"}]}},
                    currentGroupState: {"payments":{"21XWnNGNqanzZMeuJvA1zuDBGfJmkrmi4HhNe1qARni5Lbdotj":{"data":{"toUser":"u2","amount":50,"total":50,"partial":false,"currencyFromTo":["USD","USD"],"groupMincome":1000,"exchangeRate":1,"txid":"0.5957740209259536","status":"completed","paymentType":"manual","completedDate":"2020-11-28T21:19:10.447Z"},"meta":{"createdDate":"2020-11-28T21:19:10.325Z","username":"u1","identityContractID":"21XWnNXc5uwULhz77j5o54xonZdASLdWM9YMrEkf2nYNbGaddN"},"history":[["2020-11-28T21:19:10.325Z","21XWnNGNqanzZMeuJvA1zuDBGfJmkrmi4HhNe1qARni5Lbdotj"],["2020-11-28T21:19:10.447Z","21XWnNNgkHye4Unf4vRxCy5aZF2t5KYPS6uCdXftUhj5pRaVct"]]},"21XWnNMjLqLeQiUn31Ewup7WPbFSvFmRiFi2u7KfQj4z5SNNGt":{"data":{"toUser":"u3","amount":125,"total":125,"partial":false,"currencyFromTo":["USD","USD"],"groupMincome":1000,"exchangeRate":1,"txid":"0.09331297662017901","status":"completed","paymentType":"manual","completedDate":"2020-11-28T21:20:10.665Z"},"meta":{"createdDate":"2020-11-28T21:20:10.234Z","username":"u1","identityContractID":"21XWnNXc5uwULhz77j5o54xonZdASLdWM9YMrEkf2nYNbGaddN"},"history":[["2020-11-28T21:20:10.234Z","21XWnNMjLqLeQiUn31Ewup7WPbFSvFmRiFi2u7KfQj4z5SNNGt"],["2020-11-28T21:20:10.665Z","21XWnNUAzT9xddnfQ2sJ7cw7ZxJMNVrDJj79HKmFP5ehaHvQnM"]]}},"paymentsByMonth":{"2020-11":{"firstMonthsCurrency":"USD","mincomeExchangeRate":1,"paymentsFrom":{"u1":{"u2":["21XWnNGNqanzZMeuJvA1zuDBGfJmkrmi4HhNe1qARni5Lbdotj"],"u3":["21XWnNMjLqLeQiUn31Ewup7WPbFSvFmRiFi2u7KfQj4z5SNNGt"]}},"lastAdjustedDistribution":[{"amount":50,"from":"u1","to":"u2"},{"amount":125,"from":"u1","to":"u3"},{"amount":50,"from":"u4","to":"u2"},{"amount":125,"from":"u4","to":"u3"}]}},"invites":{"221":{"inviteSecret":"221","quantity":60,"creator":"INVITE_INITIAL_CREATOR","status":"valid","responses":{"u2":true,"u3":true,"u4":true},"expires":1638588240000}},"proposals":{},"settings":{"groupCreator":"u1","groupName":"uus","groupPicture":"http://localhost:3000/file/21XWnNFtopsagi4HNX9GfSmWAp4956Pg4WHDSYmNVzbRaoxtbD?type=image%2Fjpeg","sharedValues":"","mincomeAmount":1000,"mincomeCurrency":"USD","proposals":{"group-setting-change":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}},"invite-member":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}},"remove-member":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}},"proposal-setting-change":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}},"generic":{"rule":"disagreement","expires_ms":1209600000,"ruleSettings":{"percentage":{"threshold":0.75},"disagreement":{"threshold":60}}}}},"profiles":{"u1":{"globalUsername":"","contractID":"21XWnNXc5uwULhz77j5o54xonZdASLdWM9YMrEkf2nYNbGaddN","joinedDate":"2020-11-28T21:16:09.521Z","nonMonetaryContributions":[],"status":"active","departedDate":null,"incomeDetailsType":"pledgeAmount","pledgeAmount":250,"paymentMethods":[]},"u2":{"globalUsername":"","contractID":"21XWnNN9SEzyocW8hYQ3tQP2DR8vcWZq4FYELLJKqXptVtJHZi","joinedDate":"2020-11-28T21:16:30.372Z","nonMonetaryContributions":[],"status":"active","departedDate":null,"incomeDetailsType":"incomeAmount","incomeAmount":900,"paymentMethods":[]},"u3":{"globalUsername":"","contractID":"21XWnNRqy2AcvnCZgaBeC75kMEKe7Kk6f7yT8kAcAeuhwqMKmq","joinedDate":"2020-11-28T21:16:31.876Z","nonMonetaryContributions":[],"status":"active","departedDate":null,"incomeDetailsType":"incomeAmount","incomeAmount":750,"paymentMethods":[]},"u4":{"globalUsername":"","contractID":"21XWnNY9cwKdkMK5Cxuf2ZYB7s2yPRLb4Cn6kpYtCrwvTcpFSR","joinedDate":"2020-11-28T21:16:36.146Z","nonMonetaryContributions":[],"status":"active","departedDate":null,"incomeDetailsType":"pledgeAmount","pledgeAmount":250,"paymentMethods":[]}}},
                  },
                  monthstamp: "2020-11",
                  adjusted: true
              })
              should(dist).eql([
                //TODO: The full payment does not eliminate the amounts owed by u1 to u3
                { amount: 11.538461538461538, from: 'u1', to: 'u2' },
                { amount: 29.585798816568047, from: 'u4', to: 'u2' },
                { amount: 28.846153846153847, from: 'u1', to: 'u3' },
                { amount: 73.96449704142013, from: 'u4', to: 'u3' }

              ])
          }
      )
  }
)
describe('group income distribution logic', function () {
  it('can distribute income evenly with two users', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      }
    })
    should(dist).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })

  it('has no effect for adjustment when there are no payments', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(dist).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })

  it('ignores existing payments when not adjusted', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      }
    })
    should(dist).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })

  it('takes into account payments from this month when adjusted', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 2, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 1]', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 925, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 75, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 25, from: 'u1', to: 'u3' }
    ])
  })

  it('[scenario 2]', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 3] redistributes excess of todo-payments back into other todo-payments', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 700, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 25, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 75, from: 'u1', to: 'u3' }
    ])
  })

  it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 4.1] can distribute money from new members', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 50, from: 'u4', to: 'u2' },
      { amount: 50, from: 'u4', to: 'u3' }
    ])
  })

  it('splits money evenly between two pledgers and two needers', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(dist).eql([
      { amount: 71.42857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857, from: 'u1', to: 'u3' },
      { amount: 28.57142857, from: 'u4', to: 'u2' },
      { amount: 71.42857143, from: 'u4', to: 'u3' }
    ])
  })

  it('stops asking user to pay someone they fully paid their share to', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 178.57, from: 'u1', to: 'u3' },
      { amount: 28.57142857, from: 'u4', to: 'u2' },
      { amount: 71.42857143, from: 'u4', to: 'u3' }
    ])
  })

  it.skip('does not ask users who have paid their full share to pay any more', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' },
          'payment2': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-13T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'], 'u3': ['payment2'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 28.57142857, from: 'u4', to: 'u2' },
      { amount: 71.42857143, from: 'u4', to: 'u3' }
    ])
  })

  describe('using new data->events helper function', function () {
    it('can distribute income evenly with two users', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })).eql([
        { amount: 2, from: 'u1', to: 'u2' }
      ])
    })

    it('can distribute income evenly with three users but still have need', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 9 }
        ],
        needs: [
          { name: 'u2', need: 40 },
          { name: 'u3', need: 80 }
        ],
        events: []
      })).eql([
        { amount: 3, from: 'u1', to: 'u2' },
        { amount: 6, from: 'u1', to: 'u3' }
      ])
    })

    it('can distribute income evenly with three users and excess', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 21 }
        ],
        needs: [
          { name: 'u2', need: 4 },
          { name: 'u3', need: 8 }
        ],
        events: []
      })).eql([
        { amount: 4, from: 'u1', to: 'u2' },
        { amount: 8, from: 'u1', to: 'u3' }
      ])
    })

    it('distribute income above mincome proportionally', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'd', have: 10 },
          { name: 'e', have: 30 },
          { name: 'f', have: 60 }
        ],
        needs: [
          { name: 'a', need: 30 },
          { name: 'b', need: 20 }
        ],
        events: []
      })).eql([
        { amount: 3, from: 'd', to: 'a' },
        { amount: 9, from: 'e', to: 'a' },
        { amount: 18, from: 'f', to: 'a' },
        { amount: 2, from: 'd', to: 'b' },
        { amount: 6, from: 'e', to: 'b' },
        { amount: 12, from: 'f', to: 'b' }
      ])
    })

    it('distribute income above mincome proportionally when extra won\'t cover need', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'd', have: 4 },
          { name: 'e', have: 4 },
          { name: 'f', have: 10 }
        ],
        needs: [
          { name: 'a', need: 30 },
          { name: 'b', need: 20 }
        ],
        events: []
      })).eql([
        { amount: 2.4, from: 'd', to: 'a' },
        { amount: 2.4, from: 'e', to: 'a' },
        { amount: 6, from: 'f', to: 'a' },
        { amount: 1.6, from: 'd', to: 'b' },
        { amount: 1.6, from: 'e', to: 'b' },
        { amount: 3.9999999999999996, from: 'f', to: 'b' }
      ])
    })

    it('don\'t distribute anything if no one is above mincome', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [],
        needs: [
          { name: 'a', need: 30 },
          { name: 'b', need: 20 },
          { name: 'd', need: 5 },
          { name: 'e', need: 20 },
          { name: 'f', need: 30 }
        ],
        events: []
      })).eql([
      ])
    })

    it('don\'t distribute anything if everyone is above mincome', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'b', have: 5 },
          { name: 'd', have: 10 },
          { name: 'e', have: 60 },
          { name: 'f', have: 12 }
        ],
        needs: [],
        events: []
      })).eql([
      ])
    })

    it('works with very imprecise splits', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 75 }
        ],
        needs: [
          { name: 'u2', need: 25 },
          { name: 'u3', need: 300 }
        ],
        events: []
      })).eql([
        { amount: 5.769230769230769, from: 'u1', to: 'u2' },
        { amount: 69.23076923076924, from: 'u1', to: 'u3' }
      ])
    })

    it('splits money evenly', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 9 }
        ],
        needs: [
          { name: 'u2', need: 80 },
          { name: 'u3', need: 40 }
        ],
        events: []
      })).eql([
        { amount: 6, from: 'u1', to: 'u2' },
        { amount: 3, from: 'u1', to: 'u3' }
      ])
    })

    it('has no effect for adjustment when there are no payments', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
      should(dist).eql([
        { amount: 2, from: 'u1', to: 'u2' }
      ])
    })

    it('ignores existing payments when not adjusted', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
      should(dist).eql([
        { amount: 2, from: 'u1', to: 'u2' }
      ])
    })

    it('takes into account payments from this month when adjusted', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 2 }
        ]
      })
      should(dist).eql([])
    })

    it('[scenario 1]', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 75 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 75 },
          { type: 'join', name: 'u3', need: 50 }
        ]
      })).eql([
        { amount: 25, from: 'u1', to: 'u3' }
      ])
    })

    it('[scenario 2]', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 50 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 100 }
        ]
      })
      should(dist).eql([])
    })

    it('[scenario 3] redistributes excess of todo-payments back into other todo-payments', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 300 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 25 }
        ]
      })
      should(dist).eql([
        { amount: 75, from: 'u1', to: 'u3' }
      ])
    })

    it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 }
        ]
      })
      should(dist).eql([])
    })

    it('[scenario 4.1] can distribute money from new members', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
          { name: 'u4', have: 150, type: 'join' }
        ]
      })
      should(dist).eql([
        { amount: 50, from: 'u4', to: 'u2' },
        { amount: 50, from: 'u4', to: 'u3' }
      ])
    })

    it('splits money evenly between two pledgers and two needers', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: []
      })
      should(dist).eql([
        { amount: 71.42857142857143, from: 'u1', to: 'u2' },
        { amount: 28.57142857142857, from: 'u4', to: 'u2' },
        { amount: 178.57142857142858, from: 'u1', to: 'u3' },
        { amount: 71.42857142857143, from: 'u4', to: 'u3' }
      ])
    })

    it('stops asking user to pay someone they fully paid their share to', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 }
        ]
      })
      should(dist).eql([
        { amount: 28.57142857142857, from: 'u4', to: 'u2' },
        { amount: 178.57, from: 'u1', to: 'u3' },
        { amount: 71.42857142857143, from: 'u4', to: 'u3' }
      ])
    })

    it.skip('does not ask users who have paid their full share to pay any more', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 },
          { type: 'payment', from: 'u1', to: 'u3', amount: 100 }
        ]
      })
      should(dist).eql([
        { amount: 28.57142857, from: 'u4', to: 'u2' },
        { amount: 71.42857143, from: 'u4', to: 'u3' }
      ])
    })
  })
})

describe('helper function', function () {
  it('can transform payment/join data into events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  it('sorts payments and joins by date', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' },
          'payment2': { amount: 20, exchangeRate: 1, status: 'completed', createdDate: '2020-10-22T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1', 'payment2'] }
            }
          }
        }
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 },
        { type: 'payment', from: 'u1', to: 'u3', amount: 20 }
      ]
    })
  })

  it('works with no events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: []
    })
  })

  it('works with only payment events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 }
      ]
    })
  })

  it('works with only join events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  it('works with no members', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {},
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(events).eql({
      haves: [],
      needs: [],
      events: []
    })
  })

  it('works with no adjustWith arguments', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {}
    })
    should(events).eql({
      haves: [],
      needs: [],
      events: []
    })
  })

  it('works when members have paid and left', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      haves: [],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  it('ignores users who have no need or excess', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 0, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      }
    })
    should(events).eql({
      haves: [],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: []
    })
  })

  it('can handle a mix of havers/needers in any order', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  describe('transforming the above examples', function () {
    it('can distribute income evenly with two users', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
    })

    it('has no effect for adjustment when there are no payments', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {},
          monthlyPayments: {}
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
    })

    it('ignores existing payments when not adjusted', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
    })

    it('takes into account payments from this month when adjusted', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 2, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 2 }
        ]
      })
    })

    it('[scenario 1]', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 925, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 75, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 75 },
          { name: 'u3', need: 50 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 75 }
        ]
      })
    })

    it('[scenario 2]', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 50 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 100 }
        ]
      })
    })

    it('[scenario 3] redistributes excess of todo-payments back into other todo-payments', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 700, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 25, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 300 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 25 }
        ]
      })
    })

    it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u3': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 }
        ]
      })
    })

    it('[scenario 4.1] can distribute money from new members', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u3': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
          { name: 'u4', have: 150, type: 'join' }
        ]
      })
    })

    it('splits money evenly between two pledgers and two needers', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {},
          monthlyPayments: {}
        }
      })).eql({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: []
      })
    })

    it('stops asking user to pay someone they fully paid their share to', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 }
        ]
      })
    })

    it('does not ask users who have paid their full share to pay any more', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' },
            'payment2': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-13T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'], 'u3': ['payment2'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 },
          { type: 'payment', from: 'u1', to: 'u3', amount: 100 }
        ]
      })
    })
  })
})
