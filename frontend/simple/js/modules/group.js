const state = {
  groupName: null,
  sharedValues: null,
  changePercentage: 0,
  memberApprovalPercentage: 0,
  memberRemovalPercentage: 80,
  incomeProvided: null,
  contributionPrivacy: 'Very Private'
}

const mutations = {
  updateGroupName (state, name) {
    state.groupName = name
  },
  updateSharedValues (state, values) {
    state.sharedValues = values
  },
  updateChangePercentage (state, percentage) {
    state.changePercentage = percentage
  },
  updateMemberApprovalPercentage (state, percentage) {
    state.memberApprovalPercentage = percentage
  },
  updateMemberRemovalPercentage (state, percentage) {
    state.memberRemovalPercentage = percentage
  },
  updateIncomeProvided (state, percentage) {
    state.incomeProvided = percentage
  },
  updateContributionPrivacy (state, privacy) {
    state.contributionPrivacy = privacy
  }
}

export default {
  state,
  mutations
}
