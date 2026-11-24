import baseConfig from './playwright.config';

export default {
  ...baseConfig,
  grep: /C-0396 theme default/,
  use: {
    ...baseConfig.use,
    launchOptions: { args: ['--disable-gpu', '--force-color-profile=srgb'] },
  },
};
