import React from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import { Card, Alert, Typography, Button, Table } from 'antd';
import { useIntl, FormattedMessage } from 'umi';
import { useFetchData } from '@/components/hooks/src';
import styles from './Welcome.less';

const CodePreview: React.FC = ({ children }) => (
  <pre className={styles.pre}>
    <code>
      <Typography.Text copyable>{children}</Typography.Text>
    </code>
  </pre>
);

const Welcome: React.FC = () => {
  const intl = useIntl();

  const {
    data,
    pagination,
    // changeHandler,
    // loading,
    // error,
    // setUrl, // 用于变更url
    setParams, // 用于变更参数
    // setData, // 用于手动更新自定义数据
    reload,
  } = useFetchData({
    url: 'api/rules',
    params: { current: 1, pageSize: 20 }, // 参数
    // initData: [...], // 可以传入初始化数据 会在请求完成后被覆盖
    // token: 'xxxxxx', // 可以手动传入token以覆盖config/config.ts中定义的Token
    // concatData: true, // 默认false  传入true则会对后续每一次请求的数据与之前的数据进行合并 适用于下拉加载更多的场景
    dataProcess: (data) => data.data, // 对返回的数据进行自定义处理 以得到期望的列表数据 纯函数 不能有副作用 否则可能会执行两次
    doWhileInit: true, // 加载后需手动进行请求处理  与useRequest的manual一致
    // noPrefix: true, // 发送的ajax请求不自动携带项目及类型前缀（/nfm/api/或/nfm/mock/）
    // paginationProcess: data => ({total : 200}),
    // successHandler: (data, params) => {}, // 加载成功后的集中回调(code = 0)
    // errorHandler: (err,params) => alert(err),  //自定义错误处理 会覆盖默认处理
    // completeHandler: (v) => {}, // 请求完成后回调
    // dependencies: [xx] // 依赖的外部State  若数组中有任一State发生变动 则进行data reload
  });

  console.log(data);

  const columns = [
    {
      title: '名字',
      dataIndex: 'name',
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: '排序',
      dataIndex: 'desc',
    },
    {
      title: '测试',
      dataIndex: 'callNo',
    },
    {
      title: '状态',
      dataIndex: 'status',
    },
    {
      title: '测试',
      dataIndex: 'updatedAt',
    },
  ];

  console.log(data);
  return (
    <PageContainer>
      <Card>
        <Alert
          message={intl.formatMessage({
            id: 'pages.welcome.alertMessage',
            defaultMessage: 'Faster and stronger heavy-duty components have been released.',
          })}
          type="success"
          showIcon
          banner
          style={{
            margin: -12,
            marginBottom: 24,
          }}
        />
        <Typography.Text strong>
          <FormattedMessage id="pages.welcome.advancedComponent" defaultMessage="Advanced Form" />{' '}
          <a
            href="https://procomponents.ant.design/components/table"
            rel="noopener noreferrer"
            target="__blank"
          >
            <FormattedMessage id="pages.welcome.link" defaultMessage="Welcome" />
          </a>
        </Typography.Text>
        <CodePreview>
          {' '}
          <Button
            onClick={() => setParams({ current: 2, pageSize: 20 })}
            // reload()
          >
            测试
          </Button>
          <Table
            dataSource={data}
            columns={columns}
            pagination={pagination}
            // pagination={
            //   current
            // }
          />
        </CodePreview>
        <Typography.Text
          strong
          style={{
            marginBottom: 12,
          }}
        >
          <FormattedMessage id="pages.welcome.advancedLayout" defaultMessage="Advanced layout" />{' '}
          <a
            href="https://procomponents.ant.design/components/layout"
            rel="noopener noreferrer"
            target="__blank"
          >
            <FormattedMessage id="pages.welcome.link" defaultMessage="Welcome" />
          </a>
        </Typography.Text>
        <CodePreview>yarn add @ant-design/pro-layout</CodePreview>
      </Card>
    </PageContainer>
  );
};

export default Welcome;
