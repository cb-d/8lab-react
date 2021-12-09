import { history } from 'umi';
import { storageUtils } from '../index';

const { LoginURL = '', Token = '', UserAccess = false } = process.env || {};
const checkToken = () => {
  const requestToken = getRequestToken();

  if (UserAccess !== false && !requestToken) {
    redirectLogin();
  }
};

const getRequestToken = () => {
  const getParamsToken = history?.location?.query?.token || '';

  const userToken = storageUtils.getUserToken();

  // 优先级
  let requestToken = getParamsToken || userToken || Token || '';
  requestToken = `Bearer ${requestToken}`;
  return requestToken;
};

const getRequestTokenHeaderName = (token: string, tokenName: string): string =>
  !token && history?.location?.query?.token ? 'X-CSRF-TOKEN' : tokenName;

const redirectLogin = (unLoginRedirectUrl = ''): void => {
  if (UserAccess !== false && LoginURL && window.location.href !== LoginURL) {
    storageUtils.setLastLocationHref(window.location.href);
    window.location.href = unLoginRedirectUrl || LoginURL;
  }
};

export { checkToken, redirectLogin, getRequestToken, getRequestTokenHeaderName };
