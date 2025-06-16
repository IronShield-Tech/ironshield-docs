import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroIcon}>
          <img 
            src="/img/IronShield-Icon-No-Bkg.svg" 
            alt="IronShield"
            className={styles.heroIconImage}
          />
        </div>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            style={{color: '#000'}}
            to="/docs/intro">
            ⏱️ Get Started in 5 Minutes 
          </Link>
        </div>
        <p className={styles.enterpriseDescription}>
          Enterprise-Grade Edge-Native Scraping & L7 DDoS Firewall. Built on Adaptive Proof of Work Challenges and Stateless Bot Fingerprinting.
        </p>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Documentation`}
      description="IronShield Security Documentation">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
