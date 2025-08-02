import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function ApiPage(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title="API Reference"
      description="IronShield API documentation and interactive Swagger UI">
      <div style={{ height: 'calc(100vh - 60px)', width: '100%' }}>
        <iframe
          src="https://api.ironshield.cloud"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="IronShield API Documentation"
        />
      </div>
    </Layout>
  );
} 