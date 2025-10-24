/* eslint-disable import/no-anonymous-default-export */
import nextCoreWebVitalsSource from "eslint-config-next/core-web-vitals";

const seenPlugins = new Set();

const sanitizePlugins = (plugins) => {
  if (!plugins) return undefined;
  const allowedKeys = new Set(["rules", "processors", "environments", "meta"]);
  return Object.fromEntries(
    Object.entries(plugins).map(([name, plugin]) => {
      if (seenPlugins.has(name)) {
        return [name, null];
      }
      seenPlugins.add(name);
      const safePlugin = {};
      for (const key of Object.keys(plugin)) {
        if (allowedKeys.has(key)) {
          safePlugin[key] = plugin[key];
        }
      }
      return [name, safePlugin];
    })
  );
};

const nextCoreWebVitalsConfigs = nextCoreWebVitalsSource.map((config) => {
  const sanitizedConfig = {};
  if (config.name) sanitizedConfig.name = config.name;
  if (config.files) sanitizedConfig.files = config.files;
  if (config.ignores) sanitizedConfig.ignores = config.ignores;
  if (config.languageOptions) {
    sanitizedConfig.languageOptions = { ...config.languageOptions };
  }
  if (config.settings) sanitizedConfig.settings = config.settings;
  if (config.rules) sanitizedConfig.rules = config.rules;
  const pluginEntries = sanitizePlugins(config.plugins);
  if (pluginEntries) {
    const filteredEntries = Object.fromEntries(
      Object.entries(pluginEntries).filter(([, plugin]) => plugin !== null)
    );
    if (Object.keys(filteredEntries).length > 0) {
      sanitizedConfig.plugins = filteredEntries;
    }
  }
  return sanitizedConfig;
});

export default [
  {
    ignores: ["**/node_modules/**", ".next/**", "out/**"],
  },
  ...nextCoreWebVitalsConfigs,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
];
