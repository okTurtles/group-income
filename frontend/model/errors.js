'use strict'

// TODO: I don't think babel converts these to be compatible with
//       e.g. Safari, to ensure that e.name etc. is properly set
export class GIErrorIgnore extends Error {}
export class GIErrorIgnoreAndBanIfGroup extends Error {}
export class GIErrorSaveAndReprocess extends Error {}
