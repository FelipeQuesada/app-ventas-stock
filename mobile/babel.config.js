module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // pdfjs-dist usa import.meta; Hermes no lo soporta sin este polyfill
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
