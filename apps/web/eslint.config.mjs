import nextConfig from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [...nextConfig, ...nextTypescript, { ignores: ['.next/**'] }];

export default config;
