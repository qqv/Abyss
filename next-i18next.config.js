/** next-i18next configuration */
module.exports = {
  i18n: {
    locales: ["zh-CN", "en"],
    defaultLocale: "zh-CN",
  },
  reloadOnPrerender: process.env.NODE_ENV === "development",
};


