// Optional plugins: the dev server also works when these dev packages are not installed
// (for example on a phone), because styles.css is already built.
function optional(name, options) {
  try {
    return require(name)(options);
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') return false;
    throw error;
  }
}

module.exports = {
  plugins: [
    // PostCSS Preset Env - enables modern CSS features with fallbacks
    optional('postcss-preset-env', {
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': true,
        'media-query-ranges': true,
      },
      autoprefixer: {
        grid: true,
        flexbox: true,
        cascade: false,
      },
      browsers: [
        '> 1%',
        'last 2 versions',
        'Firefox ESR',
        'not dead',
        'not ie 11',
      ],
    }),

    // CSSNano for production optimization
    process.env.NODE_ENV === 'production' ? optional('cssnano', {
      preset: [
        'default',
        {
          // Keep CSS readable in development
          normalizeWhitespace: process.env.NODE_ENV === 'production',
          discardComments: {
            removeAll: process.env.NODE_ENV === 'production',
          },
          // Optimize for production
          mergeLonghand: process.env.NODE_ENV === 'production',
          colormin: process.env.NODE_ENV === 'production',
          minifyFontValues: process.env.NODE_ENV === 'production',
          minifyGradients: process.env.NODE_ENV === 'production',
        },
      ],
    }) : false,
  ].filter(Boolean), // Remove any false values from the plugins array
}