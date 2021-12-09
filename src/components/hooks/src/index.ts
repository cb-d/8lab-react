import useFetchData from './libs/useFetchData'
import useColumns from './libs/useColumns'
import useWindowSize from './libs/useWindowSize'
import useLocalStorage, {
  getUserInfo,
  getUserToken,
  setLastLocationHref,
  updateActiveTime,
  getAccessUpdatedKey,
  updateAccessList,
} from './libs/useLocalStorage'

const storageUtils = {
  getUserInfo,
  getUserToken,
  setLastLocationHref,
  updateActiveTime,
  getAccessUpdatedKey,
  updateAccessList,
}

export {
  useFetchData,
  useColumns,
  useWindowSize,
  useLocalStorage,
  storageUtils,
}
