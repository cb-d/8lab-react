/*
* Filename         :useColumns.ts
* Time             :2021/04/19 13:42:57
* Author           :panduo
* Email            :panduo@ncmps.com
* Description      :基于antd table的columns，若有若干列有render属性且引入了外部变量，
                    或有column setter等动态改变columns内容的需求，适用此逻辑
*
*/

import { useState, useEffect, useRef } from 'react'
import _ from 'lodash'

type columnType = Record<string, any>

interface propsType {
    /**
     * 默认columns
     */
    columns: columnType[],
    /**
     * columns内部依赖的外部变量
     */
    dependencies?: any[],
}

const useColumns = (props: propsType): {
  columns: columnType[],
  initColumns: columnType[],
  resetInitColumns: (columns: columnType[]) => void,
  columnsSetter: (columns: columnType[]) => void
} => {
  const { columns = [], dependencies = [] } = props
  //   const [...dependencies]
  const oriColsRef = useRef(columns)
  const [initColumns, setInitColumns] = useState(columns)
  const oriColsByKeyRef = useRef({})
  const [innerColumns, setInnerColumns] = useState(columns)
  const showColumnsRef = useRef<columnType[]|null>(null)

  useEffect(() => {
    oriColsByKeyRef.current = {}
    initColumns.forEach((eachCol, index) => { oriColsByKeyRef.current[eachCol.dataIndex] = index })
  }, [initColumns])

  const getColumns = (filter = false, showColumns: columnType[] = []) => {
    if (filter === true) {
      showColumnsRef.current = showColumns
    }

    if (showColumns.length > 0) {
      /**
       * 更新原始数据相应列的信息, 比如横向拉伸列宽度, 可以将同样的样式应用于其他表格
       */
      showColumns.forEach((eachCol) => {
        const { dataIndex } = eachCol

        oriColsRef.current[oriColsByKeyRef.current[dataIndex]] = eachCol
      })
    }

    const showColsKeys = (showColumnsRef.current || []).map((eachCol) => eachCol.dataIndex)

    filter = showColumnsRef.current !== null
    return oriColsRef.current.filter(
      (eachCol: columnType) => !filter || _.includes(showColsKeys, eachCol.dataIndex),
    )
  }

  const columnsSetter = (columns: columnType[] = []) => {
    setInnerColumns(getColumns(true, columns))
  }

  /**
   * 重置初始化数据 通常用于外部ajax请求返回了新的列数据
   * @param columns
   */
  const resetInitColumns = (columns: columnType[]) => {
    oriColsRef.current = columns

    showColumnsRef.current = columns.filter((eachCol: columnType) => eachCol.checked === true)

    setInitColumns([...oriColsRef.current])
    setInnerColumns(getColumns())
  }

  useEffect(() => {
    resetInitColumns(columns)
  }, [...dependencies])

  return {
    columns: innerColumns,
    initColumns, // 可以用于columns-setter的初始化
    resetInitColumns, // 手动重置
    columnsSetter,
  }
}

export default useColumns
