import {
  useEffect, useReducer, useCallback,
} from 'react'
import { timer } from 'rxjs'
import _ from 'lodash'

const prefix = '8lab-user-'
const tokenName = `${prefix}token`
const userInfoName = `${prefix}info`
const lastLocationHrefName = `${prefix}last-location-href`
const activeTimeName = `${prefix}active-time`
const accessUpdated = `${prefix}access-updated`
const { localStorage } = window

const getCurrentTimestamp = () => +new Date()
let checkUserActiveStatusTimer$

interface propsType {
    /**
     * 单位： 秒
     */
    userActivePeriod?: number,
}

interface userInfoType {
  [key: string]: string
}

interface returnType {
    getUserToken: () => string,
    getUserInfo: () => userInfoType,
    setLastLocationHref: (href: string) => void,
    login: (userInfo: userInfoType) => void,
    logout: () => void,
    isUserActive: boolean,
    /**
     * 更新用户活跃时间 若用户离线后重新登录也可以调用来重置状态为active
     */
    refreshUserActiveTime: () => void,

}

interface userActionReducerStateType {
    isUserActive: boolean,
    lastUserActiveTime: number, // 时间戳
    updateUserActiveStatusTimer: number, // 变动时更新定时器
}
enum userActionTypes {
    LOGIN,
    LOGOUT,
    REFRESH_ACTIVE_TIME,
    RESTART_TIMER,
}

export const setLastLocationHref = (href: string): void => {
  if (
    href !== process.env.LoginURL
    && !_.includes(href, process.env.LoginURL)
  ) {
    localStorage.setItem(lastLocationHrefName, href)
  }
}

export const getUserToken = (): string => localStorage.getItem(tokenName) ?? ''
export const getUserInfo = (): userInfoType => JSON.parse(localStorage.getItem(userInfoName) || '{}') ?? {}
export const updateActiveTime = ():void => {
  const currentTimestamp = getCurrentTimestamp()
  localStorage.setItem(activeTimeName, String(currentTimestamp))
}

export const updateAccessList = (init = false): string => {
  const accessUpdatedValue = getAccessUpdatedKey()
  if (init === true && (accessUpdatedValue !== '')) {
    return accessUpdatedValue as string
  }

  const newValue = String(parseInt(accessUpdatedValue || '0', 10) + 1)
  localStorage.setItem(accessUpdated, newValue)
  return newValue
}

export const getAccessUpdatedKey = (): string => localStorage.getItem(accessUpdated) || ''

const useLocalStorage = (props?: propsType): returnType => {
  const userActivePeriod = props?.userActivePeriod || process.env.tokenTime || 3600

  const userActionReducer = useCallback((
    state: userActionReducerStateType,
    action: {
      type: userActionTypes,
      payload?: {
          token: string,
          userInfo?: userInfoType
      },
    },
  ) => {
    switch (action.type) {
      /**
       * 登录时 启动定时器
       */
      case userActionTypes.LOGIN:
        localStorage.setItem(tokenName, action.payload?.token || '')
        if (_.isObject(action.payload?.userInfo)) {
          localStorage.setItem(userInfoName, JSON.stringify(action.payload?.userInfo))
        }
        /* eslint-disable-next-line */
        const currentTimestamp = getCurrentTimestamp()
        localStorage.setItem(activeTimeName, String(currentTimestamp))

        /* eslint-disable-next-line */
        const lastLocationHref = localStorage.getItem(lastLocationHrefName)
        if (lastLocationHref && window.location.href !== lastLocationHref) {
          window.location.href = lastLocationHref
        }

        return {
          lastUserActiveTime: currentTimestamp,
          isUserActive: true,
          updateUserActiveStatusTimer: state.updateUserActiveStatusTimer + 1,
        }
      /**
       * 用户有活跃动作 重置定时器
       */
      case userActionTypes.REFRESH_ACTIVE_TIME:
        /* eslint-disable-next-line */
        const res = { ...state }
        if (state.isUserActive) {
          const currentTimestamp = getCurrentTimestamp()
          localStorage.setItem(activeTimeName, String(currentTimestamp))
          res.lastUserActiveTime = currentTimestamp
          res.updateUserActiveStatusTimer += 1
        }
        return res
      /**
        * 若其他页签修改了activeTime  则在本页签定时器到期时不会执行logout 此时重启定时器
        */
      case userActionTypes.RESTART_TIMER:
        return {
          ...state,
          updateUserActiveStatusTimer: state.updateUserActiveStatusTimer + 1,
        }
      case userActionTypes.LOGOUT:
        localStorage.setItem(tokenName, '')
        localStorage.setItem(userInfoName, JSON.stringify({}))
        return {
          ...state,
          isUserActive: false,
        }
      default: throw new Error('invalid reducer type')
    }
  }, [])
  const [{
    isUserActive,
    updateUserActiveStatusTimer,
  }, dispatch] = useReducer(userActionReducer, {
    updateUserActiveStatusTimer: 0,
    isUserActive: !!localStorage.getItem(tokenName),
    lastUserActiveTime: 0,
  })
  /**
   * 超过用户活跃周期时触发的动作
   */
  useEffect(() => {
    if (updateUserActiveStatusTimer > 0) {
      if (checkUserActiveStatusTimer$) checkUserActiveStatusTimer$.unsubscribe()
      /**
        * 用户页签共享状态 其他页签也可能会修改lastActiveTime  所以timer定时到最新lastActiveTime + 过期时间
        */
      const storageTimestamp = parseInt(localStorage.getItem(activeTimeName) || '0', 10)
      const period = (userActivePeriod as number) * 1000
      checkUserActiveStatusTimer$ = timer(new Date(storageTimestamp + period)).subscribe(() => {
        const currentStorageTimestamp = parseInt(localStorage.getItem(activeTimeName) || '0', 10)
        const currentTimestamp = getCurrentTimestamp()
        /**
         * 预留误差1s
         */
        if ((currentTimestamp - currentStorageTimestamp) >= (period - 1000)) {
          dispatch({ type: userActionTypes.LOGOUT })
        } else {
          dispatch({ type: userActionTypes.RESTART_TIMER })
        }
      })
    }

    // return () => {
    //   if (checkUserActiveStatusTimer$) checkUserActiveStatusTimer$.unsubscribe()
    // }
  }, [updateUserActiveStatusTimer])

  const refreshUserActiveTime = (): void => {
    dispatch({ type: userActionTypes.REFRESH_ACTIVE_TIME })
  }

  const login = (userInfo: userInfoType) => {
    if (_.isObject(userInfo)) {
      const { token } = userInfo
      if (token) {
        dispatch({ type: userActionTypes.LOGIN, payload: { token, userInfo } })
      }
    }
  }
  const logout = () => {
    dispatch({ type: userActionTypes.LOGOUT })
  }

  return {
    getUserToken,
    getUserInfo,
    setLastLocationHref,
    login,
    logout,
    isUserActive,
    refreshUserActiveTime,
  }
}

export default useLocalStorage
