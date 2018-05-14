import sbp from '../../../sbp'
import INVITE from './invite'

const SELECTORS = {
  ...INVITE
}

sbp('sbp/selectors/register', SELECTORS)

export default SELECTORS
