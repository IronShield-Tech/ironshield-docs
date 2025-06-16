import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

import Link from '@docusaurus/Link';

type PlatformItem = {
  title: string;
  number: string;
  description: ReactNode;
  docLink: string;
};

const PlatformList: PlatformItem[] = [
  {
    title: 'Edge',
    number: '01',
    description: (
      <>
        Blocks AI scrapers and DDoS attacks at the perimeter before they reach your servers. 
        Our edge protection prevents triggering costly auto-scaling bills on popular cloud and serverless platforms.
      </>
    ),
    docLink: '/docs/intro',
  },
  {
    title: 'Core',
    number: '02',
    description: (
      <>
        Adaptive proof of work challenges and privacy-preserving bot detection engine let real people in 
        while keeping bots and data thieves out. You choose exactly who belongs on your site, without harming SEO.
      </>
    ),
    docLink: '/docs/intro',
  },
  {
    title: 'API',
    number: '03',
    description: (
      <>
        Protects every endpoint without needing custom middleware. Our rate limiting, request validation, 
        and abuse filtering keeps your site fast and your cloud bills low. Drop-in replacements for traditional API abuse protection available.
      </>
    ),
    docLink: '/docs/intro',
  },
];

function Platform({title, number, description, docLink}: PlatformItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.platformCard}>
        <div className={styles.platformNumber}>/{number}</div>
        <Heading as="h3" className={styles.platformTitle}>{title}</Heading>
        <p className={styles.platformDescription}>{description}</p>
        <Link
          className="button button--primary"
          to={docLink}>
          Learn More →
        </Link>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.platforms}>
      <div className="container">
        <div className="text--center margin-bottom--lg">
          <Heading as="h2" className={styles.platformsHeading}>Our Platforms</Heading>
        </div>
        <div className="row">
          {PlatformList.map((props, idx) => (
            <Platform key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
