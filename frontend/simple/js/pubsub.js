import Primus from '../assets/vendor/primus'
var primus
export default function (store) {
  primus = new Primus(process.env.API_URL, {timeout: 3000, strategy: ['disconnect', 'online', 'timeout']})
  primus.on('disconnection', () => store.commit('updateSocket', null))
  primus.on('error', err => console.log(err))
  primus.on('data', msg => store.dispatch('receiveEvent', msg))
  primus.on('open', () => store.commit('updateSocket', primus))
  primus.on('reconnected', () => store.commit('updateSocket', primus))
}
