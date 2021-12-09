/*
* Filename         :useWindowSize.ts
* Time             :2021/03/06 17:00:21
* Author           :panduo
* Email            :panduo@ncmps.com
* Description      :实时获取window窗口大小
*
*/

import _ from 'lodash'
import { useState, useEffect, useCallback } from 'react'

const useWindowSize = (): {width: number, height: number} => {
  const [size, setSize] = useState({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  })

  const onResizeDebounce = _.debounce(() => {
    setSize({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    })
  }, 200)

  const onResize = useCallback(() => onResizeDebounce(), [])

  useEffect(() => {
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [onResize])

  return size
}

export default useWindowSize
