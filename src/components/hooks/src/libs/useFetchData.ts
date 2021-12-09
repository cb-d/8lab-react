import React, { useEffect, useReducer, useState, useCallback, useRef } from 'react';
import { notification } from 'antd';
import axios from 'axios';
import _ from 'lodash';
import useLocalStorage from './useLocalStorage';
import { getRequestToken, redirectLogin } from '../utils';

enum requestMethodTypes {
  get = 'get',
  post = 'post',
  put = 'put',
  delete = 'delete',
}

interface paramsType {
  [key: string]: unknown | paramsType;
}

interface propsTypes {
  operation?: string;
  doWhileInit?: boolean;
  url?: string;
  userLoginAccess?: boolean;
  unLoginRedirectUrl?: string;
  noPrefix?: boolean;
  initData?: dataType;
  tokenName?: string;
  token?: string;
  method?: requestMethodTypes;
  concatData?: boolean;
  /**
   * 初始化分页信息
   */
  pagination?: paginationTypes;
  /**
   * 返回分页信息的自定义处理
   */
  paginationProcess?: (data: dataType) => paginationTypes;
  dataProcess?: (data: dataType, params: paramsType) => dataType;
  successHandler?: (data: dataType, params: paramsType, originalData: dataType) => void;
  errorHandler?: (error: string, params: paramsType) => void;
  completeHandler?: (data: dataType) => void;
  params?: paramsType;
  dependencies?: unknown[];
}
interface sorterTypes {
  column?: {
    dataIndex: string;
  };
  order?: 'ascend' | 'descend';
  field?: string;
}

enum reducerTypes {
  SET_DATA_MANUALLY,
  LOAD_PROCESS,
  LOAD_SUCCESS,
  LOAD_FAILURE,
  ABORT,
}

interface paginationTypes {
  current?: number;
  pageSize?: number;
  total?: number;
}
type cancelerType = (() => void) | null;

type dataType = any;

/**
 * operation: 操作用途
 *
 * doWhileInit: 是否在初始化时直接load
 *
 * url: 初始化Url
 *
 * noPrefix: 不使用url前缀
 *
 * initData: 初始化数据
 *
 * concatData: 获取的新数据是否与原有数据合并（仅限数组）
 *
 * dataProcess: 获取数据成功后 可选的结果处理函数  (data: any) => any  返回值会被设置为新的data
 *
 * errorHandler: 获取数据失败后  可选的错误处理函数  (error: object) => void
 *
 * successHandler: 获取数据成功后 可选的回调函数
 *
 * params: 参数对象
 *
 * dependencies: 依赖的state 变动会触发reload动作
 *
 *
 * 返回值：
 * { data, loading, error, setUrl, params, setParams}
 */
const useFetchData = ({
  operation = '',
  doWhileInit = true,
  url = '',
  userLoginAccess = true,
  unLoginRedirectUrl = '',
  method = requestMethodTypes.post,
  noPrefix = false,
  tokenName = 'Authorization',
  token = '',
  initData = [],
  concatData = false,
  dataProcess,
  errorHandler,
  successHandler,
  completeHandler,
  pagination: initPagination,
  paginationProcess,
  params,
  dependencies = [],
}: propsTypes): {
  data: dataType;
  loading: boolean;
  error: string | undefined;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  params: any;
  setParams: React.Dispatch<React.SetStateAction<paramsType>>;
  setData: React.Dispatch<React.SetStateAction<dataType>>;
  reload: () => void;
  abort: () => void;
  pagination: paginationTypes;
  /**
   * 提供一个antd表格变化时的快捷处理
   */
  changeHandler?: (pagination: paginationTypes, filters: any, sorter: sorterTypes) => void;
} => {
  const { refreshUserActiveTime, logout } = useLocalStorage();

  const { UserAccess = false, RedirectLoginCodes = [], BaseURL = '' } = process.env;

  /**
   * reducer 切换load状态
   */
  const reducer = useCallback(
    (
      state: {
        loading: boolean;
        data: dataType;
        error: string | undefined;
        pagination: paginationTypes;
      },
      action: {
        type: reducerTypes;
        data?: dataType;
        error?: string;
      },
    ) => {
      switch (action.type) {
        case reducerTypes.LOAD_PROCESS:
          /**
           * TODO 在reducerA中调用另一个reducerB的dispatch 会导致A dispatch两次 原因?
           */
          refreshUserActiveTime();
          return {
            ...state,
            loading: true,
            error: '',
          };
        case reducerTypes.ABORT:
          refreshUserActiveTime();
          return {
            ...state,
            loading: false,
            error: 'aborted',
          };
        case reducerTypes.LOAD_SUCCESS:
          /* eslint-disable-next-line */
          let { data } = action;
          /* eslint-disable-next-line */
          let listData =
            dataProcess && _.isFunction(dataProcess) ? dataProcess(data, localParams) : data;

          /* eslint-disable-next-line */
          let pagination: paginationTypes = {};
          if (paginationProcess && _.isFunction(paginationProcess)) {
            pagination = paginationProcess(data);
          } else if (_.isObject(data)) {
            if (_.isNumber(data.total) && data.total > 0) pagination.total = data.total;
          }

          if (_.keys(changedPaginationRef.current).length === 0) {
            pagination.current = changedPaginationRef.current.current;
            pagination.pageSize = changedPaginationRef.current.pageSize;

            changedPaginationRef.current = {};
          }
          if (!!concatData && _.isArray(listData)) {
            listData = (state.data || []).concat(listData);
          }

          return {
            ...state,
            loading: false,
            data: listData,
            error: '',
            pagination: _.extend({}, state.pagination, pagination),
          };
        case reducerTypes.LOAD_FAILURE:
          if (errorHandler && _.isFunction(errorHandler)) {
            errorHandler(`${operation}   ${action.error || ''}`, localParams);
          } else {
            notification.error({ message: `${operation}    ${action.error}` });
          }

          return {
            ...state,
            loading: false,
            error: action.error,
          };
        case reducerTypes.SET_DATA_MANUALLY:
          return {
            ...state,
            data: action.data,
          };
        default:
          throw new Error('invalid reducer type');
      }
    },
    [],
  );

  const cancelFunc = useRef<cancelerType>(null);
  const loadWhildInit = useRef(!!doWhileInit);
  const resData = useRef({});
  const [reloadFlag, setReloadFlag] = useState(0);
  const [localParams, setParams] = useState({ ...params });
  const [innerUrl, setUrl] = useState(url || '');
  const [manuallyData, setData] = useState(null);
  const changedPaginationRef = useRef<paginationTypes>({});
  const changedSorterRef = useRef<sorterTypes>({});
  const [result, dispatch] = useReducer(reducer, {
    loading: false,
    error: '',
    data: initData,
    pagination: {
      current: initPagination?.current || 1,
      pageSize: initPagination?.pageSize || 20,
      total: 0,
    },
  });
  const abort = () => {
    if (cancelFunc.current && _.isFunction(cancelFunc.current)) {
      cancelFunc.current();
      dispatch({ type: reducerTypes.ABORT });
    }
  };

  const changeHandler = (changedPagination: paginationTypes, _, changedSorter: sorterTypes) => {
    changedPaginationRef.current = changedPagination;
    changedSorterRef.current = changedSorter;

    doReload();
  };

  useEffect(() => {
    dispatch({ type: reducerTypes.SET_DATA_MANUALLY, data: manuallyData });
  }, [manuallyData]);

  const doReload = (): boolean => {
    abort();

    if (loadWhildInit.current) {
      const requestToken = token || getRequestToken();
      /**
       * 进行登录检测
       */
      if (UserAccess && userLoginAccess === true && !requestToken) {
        redirectLogin(unLoginRedirectUrl);
        return false;
      }
      dispatch({ type: reducerTypes.LOAD_PROCESS });
      // const reqUrl = `https://${window.location.host}/${_.trimStart(noPrefix ? `${innerUrl}` : `${BaseURL}${innerUrl}`, '/')}`
      const reqUrl = noPrefix ? `${innerUrl}` : `${BaseURL}${innerUrl}`;
      let requestMethod = method;
      if (!(requestMethod in requestMethodTypes)) requestMethod = requestMethodTypes.post;

      axios.defaults.headers.common[tokenName] = requestToken;

      // 携带cookie 注意此时Access-Control-Allow-Origin 不能为* 要为具体origin
      // axios.defaults.withCredentials=true

      // axios.defaults.crossDomain = true
      let axiosParams = {
        ...localParams,
      };
      // if (initPagination !== false) {
      //   axiosParams.current = changedPaginationRef.current?.current || result.pagination.current;
      //   axiosParams.pageSize = changedPaginationRef.current?.pageSize || result.pagination.pageSize;
      // }

      if (_.keys(changedSorterRef.current).length !== 0) {
        const { column, field, order } = changedSorterRef.current;
        if (order)
          axiosParams.orderBy = `${column?.dataIndex || field} ${
            order === 'ascend' ? 'asc' : 'desc'
          }`;
      }
      if (requestMethod === 'get') {
        axiosParams = { params: axiosParams };
      } else if (requestMethod === 'delete') {
        axiosParams = { data: axiosParams };
      }
      axios[requestMethod](reqUrl, axiosParams, {
        cancelToken: new axios.CancelToken((c) => {
          cancelFunc.current = c;
        }),
      })
        .then((data: dataType) => {
          resData.current = data;

          if (data.status === 200) {
            const serverResponse = data.data;
            /**
             * 服务端自定义错误码
             */
            if (serverResponse?.code === 200) {
              if (successHandler && _.isFunction(successHandler)) {
                successHandler(serverResponse?.data, localParams, data);
              }
              dispatch({ type: reducerTypes.LOAD_SUCCESS, data: serverResponse?.data });
            } else {
              /**
               * 返回错误码为需要重定向登录码  则跳转至登录页面
               */
              if (
                UserAccess &&
                userLoginAccess &&
                _.includes(RedirectLoginCodes || [], serverResponse?.code)
              ) {
                logout();
                redirectLogin(unLoginRedirectUrl);
                return;
              }
              dispatch({
                type: reducerTypes.LOAD_FAILURE,
                error: `${serverResponse?.message || ''} errCode:  ${serverResponse?.code}`,
              });
            }
          } else {
            dispatch({
              type: reducerTypes.LOAD_FAILURE,
              error: data.statusText || `HTTP Error, errCode:${data.status}`,
            });
          }
        })
        .catch((err) => {
          if (err.message) {
            dispatch({ type: reducerTypes.LOAD_FAILURE, error: err.message });
          }
        })
        .finally(() => {
          if (completeHandler && _.isFunction(completeHandler)) {
            completeHandler(resData.current);
          }
        });
    }
    loadWhildInit.current = true;

    return true;
  };

  useEffect(() => {
    doReload();

    return () => abort();
  }, [...dependencies, innerUrl, localParams, reloadFlag]);

  return {
    ...result,
    setUrl,
    params: localParams,
    setParams,
    setData,
    changeHandler,
    reload: () => setReloadFlag((v) => v + 1),
    abort,
  };
};

export default useFetchData;
